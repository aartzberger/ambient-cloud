import { useEffect, useRef, useState } from 'react'
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow'
import { PropTypes } from 'prop-types'
import 'reactflow/dist/style.css'
import 'views/canvas/index.css'

// Hooks
import useApi from 'hooks/useApi'
import nodesApi from 'api/nodes'
import chatflowsApi from 'api/chatflows'

// project imports
import { ChatPopUp } from '../chatmessage/ChatPopUp'
import MarketplaceCanvasNode from '../marketplaces/MarketplaceCanvasNode'
import MarketplaceAnnotationNode from 'views/marketplaces/MarketplaceAnnotationNode'
import ButtonEdge from '../canvas/ButtonEdge'

const nodeTypes = { customNode: MarketplaceCanvasNode, annotationNode: MarketplaceAnnotationNode }
const edgeTypes = { buttonedge: ButtonEdge }

// ==============================|| CANVAS ||============================== //

const Canvas = ({ modelDataPath }) => {
    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges, onEdgesChange] = useEdgesState()
    const [chatflowId, setChatflowId] = useState(null)
    const [nodeData, setNodeData] = useState(null)

    const reactFlowWrapper = useRef(null)

    // ==============================|| useEffect ||============================== //
    const getNodesApi = useApi(nodesApi.getAllNodes)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)
    const getDemoChatflowApi = useApi(chatflowsApi.getDemoChatflow)

    useEffect(() => {
        if (localStorage.getItem('duplicatedFlowData')) {
            handleLoadFlow(localStorage.getItem('duplicatedFlowData'))
            setTimeout(() => localStorage.removeItem('duplicatedFlowData'), 0)
        } else {
            setNodes([])
            setEdges([])
        }

        getNodesApi.request()
        getDemoChatflowApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Get specific chatflow successful
    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            const initialFlow = chatflow.flowData ? JSON.parse(chatflow.flowData) : []
            setNodes(initialFlow.nodes || [])
            setEdges(initialFlow.edges || [])
        } else if (getSpecificChatflowApi.error) {
            const error = getSpecificChatflowApi.error
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            errorFailed(`Failed to retrieve chatflow: ${errorData}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error])

    useEffect(() => {
        if (getDemoChatflowApi.data) {
            setChatflowId(getDemoChatflowApi.data.id)
            getSpecificChatflowApi.request(getDemoChatflowApi.data.id)
        }
    }, [getDemoChatflowApi.data])

    return (
        <>
            {!getSpecificChatflowApi.loading && getDemoChatflowApi.data && chatflowId && (
                <div className='reactflow-parent-wrapper'>
                    <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodesDraggable={false}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            minZoom={0.1}
                        >
                            <Controls
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                            <Background color='#aaa' gap={16} />
                            <ChatPopUp chatflowid={chatflowId} isExternal={true} />
                        </ReactFlow>
                    </div>
                </div>
            )}
        </>
    )
}

Canvas.propTypes = {
    modelDataPath: PropTypes.string
}

export default Canvas
