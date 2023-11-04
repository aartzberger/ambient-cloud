import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { AgentToolParams, agentToolRequest } from './core'
import { DataSource } from 'typeorm'
import { Request } from 'express'
import { DynamicTool } from 'langchain/tools'

class Agent_Tool implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Agent Tool'
        this.name = 'agentTool'
        this.version = 1.0
        this.type = 'AgentTool'
        this.icon = 'agent.svg'
        this.category = 'Tools'
        this.description = 'Use another agent you have made as a tool'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicTool)]
        this.inputs = [
            {
                label: 'Agent',
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listAgents'
            },
            {
                label: 'Agent Description',
                name: 'description',
                type: 'string',
                rows: 6,
                placeholder:
                    'This agent has access to the following tools:\n\n- Tool 1\n- Tool 2\n- Tool 3\n\nIt can be used to do the following:\n\n- Task 1\n- Task 2\n- Task 3'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listAgents(_: INodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const agents = await appDataSource.getRepository(databaseEntities['ChatFlow']).find({
                where: { user: options.user }
            })

            for (let i = 0; i < agents.length; i += 1) {
                const data = {
                    label: agents[i].name,
                    name: agents[i].id,
                    description: agents[i].description
                } as INodeOptionsValue
                returnData.push(data)
            }

            return returnData
        }
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = (nodeData.inputs?.selectedAgent as string) || `Agent_Tool_${nodeData.inputs?.model}`
        const description = nodeData.inputs?.description as string
        const id = nodeData.inputs?.model as string

        const obj = {
            name,
            description,
            func: (data: string) => agentToolRequest({ id, data } as AgentToolParams)
        } as any

        const tool = new DynamicTool(obj)

        return tool
    }
}

module.exports = { nodeClass: Agent_Tool }
