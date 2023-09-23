import { ICommonObject, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'
import { User } from '../src/database/entities/User'; // import the ChatFlow entity
import { ChatFlow } from '../src/database/entities/ChatFlow'; // import the ChatFlow entity
import { ChatMessage } from '../src/database/entities/ChatMessage'; // import the ChatFlow entity
import { Credential } from '../src/database/entities/Credential'; // import the ChatFlow entity
import { Tool } from '../src/database/entities/Tool'; // import the ChatFlow entity

export type MessageType = 'apiMessage' | 'userMessage'

/**
 * Databases
 */

export interface IUser {
    id: string
    name: string
    email: string
    chatflows?: ChatFlow[]
    chatmessages?: ChatMessage[]
    credentials?: Credential[]
    tools?: Tool[]
}

export interface IChatFlow {
    id: string
    userId: string
    name: string
    flowData: string
    updatedDate: Date
    createdDate: Date
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    analytic?: string
    chatbotConfig?: string
    user: User
    apiConfig?: any
}

export interface IChatMessage {
    id: string
    userId: string
    role: MessageType
    content: string
    chatflowid: string
    createdDate: Date
    sourceDocuments?: string
    user: User
}

export interface ITool {
    id: string
    name: string
    description: string
    color: string
    iconSrc?: string
    schema?: string
    func?: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IRemoteDb {
    id: string
    milvusUrl: string
    clientUrl: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface ICredential {
    id: string
    name: string
    credentialName: string
    encryptedData: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IComponentNodes {
    [key: string]: INode
}

export interface IComponentCredentials {
    [key: string]: INode
}

export interface IVariableDict {
    [key: string]: string
}

export interface INodeDependencies {
    [key: string]: number
}

export interface INodeDirectedGraph {
    [key: string]: string[]
}

export interface INodeData extends INodeDataFromComponent {
    inputAnchors: INodeParams[]
    inputParams: INodeParams[]
    outputAnchors: INodeParams[]
}

export interface IReactFlowNode {
    id: string
    position: {
        x: number
        y: number
    }
    type: string
    data: INodeData
    positionAbsolute: {
        x: number
        y: number
    }
    z: number
    handleBounds: {
        source: any
        target: any
    }
    width: number
    height: number
    selected: boolean
    dragging: boolean
}

export interface IReactFlowEdge {
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
    type: string
    id: string
    data: {
        label: string
    }
}

export interface IReactFlowObject {
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
    viewport: {
        x: number
        y: number
        zoom: number
    }
}

export interface IExploredNode {
    [key: string]: {
        remainingLoop: number
        lastSeenDepth: number
    }
}

export interface INodeQueue {
    nodeId: string
    depth: number
}

export interface IDepthQueue {
    [key: string]: number
}

export interface IMessage {
    message: string
    type: MessageType
}

export interface IncomingInput {
    question: string
    history: IMessage[]
    overrideConfig?: ICommonObject
    socketIOClientId?: string
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
    }
}

export interface IOverrideConfig {
    node: string
    nodeId: string
    label: string
    name: string
    type: string
}

export interface IDatabaseExport {
    chatmessages: IChatMessage[]
    chatflows: IChatFlow[]
    apikeys: ICommonObject[]
}

export type ICredentialDataDecrypted = ICommonObject

// Plain credential object sent to server
export interface ICredentialReqBody {
    name: string
    credentialName: string
    plainDataObj: ICredentialDataDecrypted
}

// Decrypted credential object sent back to client
export interface ICredentialReturnResponse extends ICredential {
    plainDataObj: ICredentialDataDecrypted
}
