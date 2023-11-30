import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { DataType, ErrorCode, MilvusClient } from '@zilliz/milvus2-sdk-node'
import { MilvusLibArgs, Milvus } from 'langchain/vectorstores/milvus'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { flatten } from 'lodash'
import { RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams } from 'langchain/text_splitter'
import { DynamicTool } from 'langchain/tools'
import { createRetrieverTool } from 'langchain/agents/toolkits'
import { BaseRetriever } from 'langchain/schema/retriever'
import { MilvusUpsert, checkJsonString, default_url } from './core'

class Milvus_Upsert_Collection implements INode {
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
        this.label = 'Add Data to Cloud Collection'
        this.name = 'cloudCollectionUpsert'
        this.version = 1.0
        this.type = 'CloudCollectionUpsert'
        this.icon = 'cloud-data.svg'
        this.category = 'Collections'
        this.description = 'Add data to one of your collections!'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever', ...getBaseClasses(DynamicTool)]
        // this.credential = {
        //     label: 'Connect Credential',
        //     name: 'credential',
        //     type: 'credential',
        //     optional: true,
        //     credentialNames: ['milvusAuth']
        // }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings',
                optional: true
            },
            {
                label: 'Name of Collection to Create',
                name: 'milvusCollection',
                type: 'string'
            },
            {
                label: 'Drop Old Collection?',
                name: 'dropOld',
                type: 'boolean',
                default: false
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // server setup
        const address = default_url
        const collectionName = nodeData.inputs?.milvusCollection as string
        const dropOld = nodeData.inputs?.dropOld as boolean
        const retrieverToolDescription = nodeData.inputs?.description as string

        // embeddings
        const docs = nodeData.inputs?.document as Document[]
        // embeddings
        const embeddings = nodeData.inputs?.embeddings
            ? nodeData.inputs?.embeddings
            : new HuggingFaceInferenceEmbeddings({ model: 'sentence-transformers/all-MiniLM-L6-v2' })
        const topK = nodeData.inputs?.topK as string

        // output
        const output = nodeData.outputs?.output as string

        // format data
        const k = topK ? parseInt(topK, 10) : 4

        // credential
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const milvusUser = getCredentialParam('milvusUser', credentialData, nodeData)
        const milvusPassword = getCredentialParam('milvusPassword', credentialData, nodeData)

        // init MilvusLibArgs
        const milVusArgs: MilvusLibArgs = {
            url: address,
            collectionName: collectionName + '_' + options.user.id
        }

        if (milvusUser) milVusArgs.username = milvusUser
        if (milvusPassword) milVusArgs.password = milvusPassword

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const flattened = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            flattened.push(new Document(flattenDocs[i]))
        }

        // text splitter
        // if single document is passed, it has not been split yet
        const obj = {} as RecursiveCharacterTextSplitterParams
        obj.chunkSize = 1500
        obj.chunkOverlap = 200
        const textSplitter = new RecursiveCharacterTextSplitter(obj)
        const splitDocs = await textSplitter.splitDocuments(flattened)

        let finalDocs = []
        // TOTO CMAN - this should update with actual name of file
        for (let doc of splitDocs) {
            doc.metadata = { fileName: 'upsert_document_' + Date.now().toString() }
            finalDocs.push(doc)
        }

        // if we want to reload for automation purposes, delete old collection then create new one
        if (dropOld) {
            const client = new MilvusClient({ address: address })
            await client.dropCollection({ collection_name: collectionName })
        }

        const vectorStore = await MilvusUpsert.fromDocuments(finalDocs, embeddings, milVusArgs)

        // Avoid Illegal Invocation
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: string) => {
            const hasColResp = await vectorStore.client.hasCollection({
                collection_name: vectorStore.collectionName
            })
            if (hasColResp.status.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error checking collection: ${hasColResp}`)
            }
            if (hasColResp.value === false) {
                throw new Error(`Collection not found: ${vectorStore.collectionName}, please create collection before search.`)
            }

            const filterStr = filter ?? ''

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
                filter: filterStr
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
            const name = collectionName + '_collection_retriever_tool'
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

module.exports = { nodeClass: Milvus_Upsert_Collection }
