import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Request } from 'express'
import { DynamicTool } from 'langchain/tools'
import OpenAI from 'openai'

class Openai_Existing_Collection implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'OpenAI Collection'
        this.name = 'openaiCollection'
        this.version = 1.0
        this.type = 'OpenaiCollection'
        this.icon = 'openai.png'
        this.category = 'Collections'
        this.description = 'Load a collection hosted by OpenAI!'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Collection Name',
                name: 'selectedCollection',
                type: 'asyncOptions',
                loadMethod: 'listCollections'
            }
        ]
        this.outputs = [
            {
                label: 'Retriever Tool',
                name: 'retrieverTool',
                baseClasses: ['DynamicTool', ...getBaseClasses(DynamicTool)]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listCollections(_: INodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            const user = options.req.user

            const files = await client.files.list()

            const returnData: INodeOptionsValue[] = []
            for (const f of Array.from(files.data)) {
                if (f.filename.includes(String(user.id))) {
                    const name = f.filename.split('_')[0]
                    // Check if the name already exists in the collections array\
                    const data = {
                        label: name,
                        name: name
                        // description: collection.description
                    } as INodeOptionsValue

                    if (!returnData.includes(data)) {
                        returnData.push(data)
                    }
                }
            }

            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {}
}

module.exports = { nodeClass: Openai_Existing_Collection }
