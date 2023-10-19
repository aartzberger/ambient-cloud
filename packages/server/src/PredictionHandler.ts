import { DataSource } from 'typeorm'
import {
    isSameOverrideConfig,
    isStartNodeDependOnInput,
    isFlowValidForStream,
    constructGraphs,
    getEndingNode,
    buildLangchain,
    getStartingNodes,
    resolveVariables,
    replaceInputsWithConfig,
    checkMemorySessionId,
    databaseEntities
} from './utils'
import { Server } from 'socket.io'
import { getDataSource } from './DataSource'
import { ChatMessage } from './database/entities/ChatMessage'
import logger from './utils/logger'
import { IReactFlowObject, INodeData, IReactFlowNode, IncomingInput } from './Interface'
import { ChatFlow } from './database/entities/ChatFlow'
import { NodesPool } from './NodesPool'
import { ChatflowPool } from './ChatflowPool'
import { CachePool } from './CachePool'

/**
 * Get first chat message id
 * @param {string} chatflowid
 * @returns {string}
 */
export async function getChatId(chatflowid: string) {
    // first chatmessage id as the unique chat id
    const firstChatMessage = await getDataSource()
        .getRepository(ChatMessage)
        .createQueryBuilder('cm')
        .select('cm.id')
        .where('chatflowid = :chatflowid', { chatflowid })
        .orderBy('cm.createdDate', 'ASC')
        .getOne()
    return firstChatMessage ? firstChatMessage.id : ''
}

export async function PredictionHandler(
    incomingInput: IncomingInput,
    chatflow: ChatFlow,
    isInternal: boolean,
    chatflowid: string,
    chatflowPool: ChatflowPool,
    nodesPool: NodesPool,
    AppDataSource: DataSource,
    cachePool: CachePool,
    socketIO?: Server
) {
    /*** Get chatflows and prepare data  ***/
    let chatId = await getChatId(chatflow.id)
    const flowData = chatflow.flowData
    const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
    const nodes = parsedFlowData.nodes
    const edges = parsedFlowData.edges

    let isStreamValid = false
    let nodeToExecuteData: INodeData

    /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation) when all these conditions met:
     * - Node Data already exists in pool
     * - Still in sync (i.e the flow has not been modified since)
     * - Existing overrideConfig and new overrideConfig are the same
     * - Flow doesn't start with/contain nodes that depend on incomingInput.question
     ***/
    const isFlowReusable = () => {
        return (
            Object.prototype.hasOwnProperty.call(chatflowPool.activeChatflows, chatflowid) &&
            chatflowPool.activeChatflows[chatflowid].inSync &&
            isSameOverrideConfig(isInternal, chatflowPool.activeChatflows[chatflowid].overrideConfig, incomingInput.overrideConfig) &&
            !isStartNodeDependOnInput(chatflowPool.activeChatflows[chatflowid].startingNodes, nodes)
        )
    }

    if (isFlowReusable()) {
        nodeToExecuteData = chatflowPool.activeChatflows[chatflowid].endingNodeData
        isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
        logger.debug(
            `[server]: Reuse existing chatflow ${chatflowid} with ending node ${nodeToExecuteData.label} (${nodeToExecuteData.id})`
        )
    } else {
        /*** Get Ending Node with Directed Graph  ***/
        const { graph, nodeDependencies } = constructGraphs(nodes, edges)
        const directedGraph = graph
        const endingNodeId = getEndingNode(nodeDependencies, directedGraph)
        if (!endingNodeId) return {status: false, result: `Sorry, there was an error, Ending node ${endingNodeId} not found`}

        const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
        if (!endingNodeData) return {status: false, result: `Ending node ${endingNodeId} data not found`}

        if (endingNodeData && endingNodeData.category !== 'Chains' && endingNodeData.category !== 'Agents') {
            return {status: false, result: `Sorry, there was en error. Ending node must be either a Chain or Agent`}
        }

        if (
            endingNodeData.outputs &&
            Object.keys(endingNodeData.outputs).length &&
            !Object.values(endingNodeData.outputs).includes(endingNodeData.name)
        ) {
            return {
                status: false,
                result: `Sorry, there was an error. Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
            }
        }

        isStreamValid = isFlowValidForStream(nodes, endingNodeData)

        /*** Get Starting Nodes with Non-Directed Graph ***/
        const constructedObj = constructGraphs(nodes, edges, true)
        const nonDirectedGraph = constructedObj.graph
        const { startingNodeIds, depthQueue } = getStartingNodes(nonDirectedGraph, endingNodeId)

        logger.debug(`[server]: Start building chatflow ${chatflowid}`)
        /*** BFS to traverse from Starting Nodes to Ending Node ***/
        const reactFlowNodes = await buildLangchain(
            startingNodeIds,
            nodes,
            graph,
            depthQueue,
            nodesPool.componentNodes,
            incomingInput.question,
            incomingInput.history,
            chatId,
            chatflowid,
            AppDataSource,
            incomingInput?.overrideConfig,
            cachePool
        )

        const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
        if (!nodeToExecute) return {status: false, result: `Sorry, there was an error. Node ${endingNodeId} not found`}

        if (incomingInput.overrideConfig) nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
        const reactFlowNodeData: INodeData = resolveVariables(
            nodeToExecute.data,
            reactFlowNodes,
            incomingInput.question,
            incomingInput.history
        )
        nodeToExecuteData = reactFlowNodeData

        const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))
        chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
    }

    const nodeInstanceFilePath = nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
    const nodeModule = await import(nodeInstanceFilePath)
    const nodeInstance = new nodeModule.nodeClass()

    logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

    if (nodeToExecuteData.instance) checkMemorySessionId(nodeToExecuteData.instance, chatId)

    let result = isStreamValid
        ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
              chatHistory: incomingInput.history,
              socketIO,
              socketIOClientId: incomingInput.socketIOClientId,
              logger,
              appDataSource: AppDataSource,
              databaseEntities,
              analytic: chatflow.analytic
          })
        : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
              chatHistory: incomingInput.history,
              logger,
              appDataSource: AppDataSource,
              databaseEntities,
              analytic: chatflow.analytic
          })

    logger.debug(`[server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

    return {status: true, result: result}
}

export default PredictionHandler
