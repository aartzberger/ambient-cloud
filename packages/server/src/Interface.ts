import { ICommonObject, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'
import { User } from '../src/database/entities/User'
import { ChatFlow } from '../src/database/entities/ChatFlow'
import { ChatMessage } from '../src/database/entities/ChatMessage'
import { Credential } from '../src/database/entities/Credential'
import { ApiKey } from '../src/database/entities/ApiKey'
import { Tool } from '../src/database/entities/Tool'
import { Automation } from './database/entities/Automation'
import { Trigger } from './database/entities/Trigger'
import { AutomationHandler } from './database/entities/AutomationHandler'
import { RemoteDb } from './database/entities/RemoteDb'
import { Collection } from './database/entities/Collection'
import { Assistant } from './database/entities/Assistant'
import { Subscription } from './database/entities/Subscription'

export type MessageType = 'apiMessage' | 'userMessage'

export enum chatType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
}
/**
 * Databases
 */

export interface IUser {
    id: string
    name: string
    email: string
    password?: string
    oauthType?: string
    oauthId?: string
    customerId: string
    subscription?: Subscription
    chatflows?: ChatFlow[]
    chatmessages?: ChatMessage[]
    credentials?: Credential[]
    tools?: Tool[]
    apiKeys?: ApiKey[]
    remoteDb?: RemoteDb[]
    collections?: Collection[]
    automation?: Automation[]
    trigger?: Trigger[]
    assistants?: Assistant[]
    AutomationHandler?: AutomationHandler[]
}

export interface ISubscription {
    id: string
    status: string
    subscriptionId: string
    details: any
    product: any
    usage: any
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IChatFlow {
    id: string
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
    automation?: Automation
    apiConfig?: any
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    sourceDocuments?: string
    usedTools?: string
    fileAnnotations?: string
    chatType: string
    chatId: string
    memoryType?: string
    sessionId?: string
    createdDate: Date
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

export interface IAutomation {
    id: string
    name: string
    enabled: boolean
    chatflowid: string
    url: string
    cache?: string
    updatedDate: Date
    createdDate: Date
    interval?: string
    timeZone: string
    user: User
}

export interface ITrigger {
    id: string
    name: string
    description: string
    color: string
    iconSrc?: string
    func?: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IAutomationHandler {
    id: string
    name: string
    description: string
    color: string
    iconSrc?: string
    schema?: string
    func?: string
    updatedDate: Date
    createdDate: Date
}

export interface IRemoteDb {
    id: string
    url: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface ICollection {
    id: string
    name: string
    type: string
    files?: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IAssistant {
    id: string
    details: string
    credential: string
    iconSrc?: string
    updatedDate: Date
    createdDate: Date
    user: User
}

export interface IAssistant {
    id: string
    details: string
    credential: string
    iconSrc?: string
    updatedDate: Date
    createdDate: Date
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

export interface IApiKey {
    id: string
    keyName: string
    apiKey: string
    apiSecret: string
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
    chatId?: string
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
    }
}

export interface IActiveCache {
    [key: string]: Map<any, any>
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
