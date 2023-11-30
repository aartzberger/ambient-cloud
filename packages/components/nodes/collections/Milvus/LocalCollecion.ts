import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { DataType, ErrorCode, MilvusClient } from '@zilliz/milvus2-sdk-node'
import { MilvusLibArgs, Milvus } from 'langchain/vectorstores/milvus'
import { getBaseClasses } from '../../../src/utils'
import { Document } from 'langchain/document'
import { DataSource } from 'typeorm'
import { Request } from 'express'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { DynamicTool } from 'langchain/tools'
import { createRetrieverTool } from 'langchain/agents/toolkits'
import { BaseRetriever } from 'langchain/schema/retriever'
import { checkJsonString } from './core'

// TODO CMAN - chang this for input
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

class Local_Existing_Collection implements INode {
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
        this.label = 'Load Local Collection'
        this.name = 'localCollection'
        this.version = 2.0
        this.type = 'LocalCollection'
        this.icon = 'collection.svg'
        this.category = 'Collections'
        this.description = 'Load one of your locally hosted data collections!'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever', ...getBaseClasses(DynamicTool)]
        this.inputs = [
            {
                label: 'Collection Name',
                name: 'selectedCollection',
                type: 'asyncOptions',
                loadMethod: 'listCollections'
            },
            {
                label: 'Retriever Tool Description',
                name: 'description',
                optional: true,
                type: 'string',
                description: 'When should agent use this tool to retrieve documents',
                rows: 3,
                default: 'Searches and returns information essential to answering the question. Always use this tool to stay well informed',
                additionalParams: true
            },
            {
                label: 'Filter',
                name: 'milvusFilter',
                type: 'string',
                optional: true,
                description:
                    'Filter data with a simple string query. Refer Milvus <a target="_blank" href="https://milvus.io/blog/2022-08-08-How-to-use-string-data-to-empower-your-similarity-search-applications.md#Hybrid-search">docs</a> for more details.',
                placeholder: 'doc=="a"',
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Retriever Tool',
                name: 'retrieverTool',
                baseClasses: ['DynamicTool', ...getBaseClasses(DynamicTool)]
            },
            {
                label: 'Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Milvus)]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listCollections(_: INodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }
            const RemoteDb = await appDataSource.getRepository(databaseEntities['RemoteDb']).findOneBy({
                user: options.user
            })
            const url = (RemoteDb as any).url

            const clientConfig = {
                address: url as string
            }

            const client = new MilvusClient(clientConfig)

            const collections = await client.query({
                // Return the name and schema of the collection.
                collection_name: 'ambient',
                filter: `user in ['${String(options.req.user.id)}']`,
                output_fields: ['partition'],
                limit: 15000
            })

            let collectionNames = collections.data.map((collection: any) => collection.partition) as any
            collectionNames = new Set(collectionNames) // keep only unique occurances

            for (let name of collectionNames) {
                const data = {
                    label: name,
                    name: name
                    // description: collection.description
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const RemoteDb = await options.appDataSource.getRepository(options.databaseEntities['RemoteDb']).findOneBy({
            user: options.user
        })

        const address = (RemoteDb as any).url
        const partitionName = nodeData.inputs?.selectedCollection as string
        const milvusFilter = nodeData.inputs?.milvusFilter as string
        const retrieverToolDescription = nodeData.inputs?.description as string
        console.log(options)

        // embeddings
        // const embeddings = nodeData.inputs?.embeddings
        //     ? nodeData.inputs?.embeddings
        //     : new HuggingFaceInferenceEmbeddings({ model: 'sentence-transformers/all-MiniLM-L6-v2' })
        const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
        const topK = nodeData.inputs?.topK as string

        // output
        const output = nodeData.outputs?.output as string

        // format data
        const k = topK ? parseInt(topK, 10) : 10

        // init MilvusLibArgs
        const milVusArgs: MilvusLibArgs = {
            url: address,
            collectionName: 'ambient'
        }

        const vectorStore = await Milvus.fromExistingCollection(embeddings, milVusArgs)

        // Avoid Illegal Invocation
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: string) => {
            // if there is no partision name, return empty array
            if (!partitionName) return []

            const hasColResp = await vectorStore.client.hasCollection({
                collection_name: vectorStore.collectionName
            })
            if (hasColResp.status.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error checking collection: ${hasColResp}`)
            }
            if (hasColResp.value === false) {
                throw new Error(`Collection not found: ${vectorStore.collectionName}, please create collection before search.`)
            }

            await vectorStore.grabCollectionFields()

            const loadResp = await vectorStore.client.loadCollectionSync({
                collection_name: vectorStore.collectionName
            })

            if (loadResp.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error loading collection: ${loadResp}`)
            }

            const outputFields = vectorStore.fields.filter((field) => field !== vectorStore.vectorField)

            const searchResp = await vectorStore.client.search({
                collection_name: vectorStore.collectionName,
                search_params: {
                    anns_field: vectorStore.vectorField,
                    topk: k.toString(),
                    metric_type: vectorStore.indexCreateParams.metric_type,
                    params: vectorStore.indexSearchParams
                },
                output_fields: outputFields,
                vector_type: DataType.FloatVector,
                vectors: [query],
                filter: `partition in ['${partitionName}']`
            })
            if (searchResp.status.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error searching data: ${JSON.stringify(searchResp)}`)
            }
            const results: [Document, number][] = []
            searchResp.results.forEach((result) => {
                const fields = {
                    pageContent: '',
                    metadata: {} as Record<string, any>
                }
                Object.keys(result).forEach((key) => {
                    if (key === vectorStore.textField) {
                        fields.pageContent = result[key]
                    } else if (vectorStore.fields.includes(key) || key === vectorStore.primaryField) {
                        if (typeof result[key] === 'string') {
                            const { isJson, obj } = checkJsonString(result[key])
                            fields.metadata[key] = isJson ? obj : result[key]
                        } else {
                            fields.metadata[key] = result[key]
                        }
                    }
                })
                results.push([new Document(fields), result.score])
            })
            return results
        }

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        } else if (output === 'retrieverTool') {
            // TODO CMAN - should default to a collection description
            const name = partitionName + '_retriever_tool'
            const description = retrieverToolDescription
            const retriever = vectorStore.asRetriever(k)
            const tool = createRetrieverTool(retriever as BaseRetriever, {
                name,
                description
            })
            return tool
        }
    }
}

module.exports = { nodeClass: Local_Existing_Collection }
