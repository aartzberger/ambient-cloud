import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { ConversationChain } from 'langchain/chains'
import { getBaseClasses, mapChatHistory } from '../../../src/utils'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from 'langchain/prompts'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { BaseChatModel } from 'langchain/chat_models/base'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { flatten } from 'lodash'
import { Document } from 'langchain/document'

let systemMessage = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.`

class ConversationChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversation Chain'
        this.name = 'conversationChain'
        this.version = 1.0
        this.type = 'ConversationChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Chat models specific conversational chain with memory'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseMemory',
                optional: true,
                description: 'If left empty, a default BufferMemory will be used'
            },
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                description:
                    'Include whole document into the context window, if you get maximum context length error, please use model with higher context window like Claude 100k, or gpt4 32k',
                optional: true,
                list: true
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder: 'You are a helpful assistant that write codes'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const externalMemory = nodeData.inputs?.memory as BufferMemory
        const prompt = nodeData.inputs?.systemMessagePrompt as string
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            if (flattenDocs[i] && flattenDocs[i].pageContent) {
                finalDocs.push(new Document(flattenDocs[i]))
            }
        }

        let finalText = ''
        for (let i = 0; i < finalDocs.length; i += 1) {
            finalText += finalDocs[i].pageContent
        }

        const replaceChar: string[] = ['{', '}']
        for (const char of replaceChar) finalText = finalText.replaceAll(char, '')

        if (finalText) systemMessage = `${systemMessage}\nThe AI has the following context:\n${finalText}`

        let memory
        if (externalMemory) {
            externalMemory.memoryKey = 'chat_history'
            externalMemory.inputKey = 'question'
            externalMemory.outputKey = 'text'
            externalMemory.returnMessages = true
            memory = externalMemory
        } else {
            const fields: BufferMemoryInput = {
                memoryKey: 'chat_history',
                inputKey: 'question',
                outputKey: 'text',
                returnMessages: true
            }
            memory = new BufferMemory(fields)
        }

        const obj: any = {
            llm: model,
            memory,
            verbose: process.env.DEBUG === 'true' ? true : false
        }

        const chatPrompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(prompt ? `${prompt}\n${systemMessage}` : systemMessage),
            new MessagesPlaceholder(memory.memoryKey ?? 'chat_history'),
            HumanMessagePromptTemplate.fromTemplate('{input}')
        ])
        obj.prompt = chatPrompt

        const chain = new ConversationChain(obj)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance as ConversationChain

        if (options && options.chatHistory) {
            ;(chain.memory as any).chatHistory = mapChatHistory(options)
        }

        const loggerHandler = new ConsoleCallbackHandler(options.logger)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const res = await chain.call({ input }, [loggerHandler, handler, ...callbacks])
            return res?.response
        } else {
            const res = await chain.call({ input }, [loggerHandler, ...callbacks])
            return res?.response
        }
    }
}

module.exports = { nodeClass: ConversationChain_Chains }
