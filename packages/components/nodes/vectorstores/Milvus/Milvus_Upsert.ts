import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { DataType, ErrorCode, MetricType, IndexType, MilvusClient } from '@zilliz/milvus2-sdk-node'
import { MilvusLibArgs, Milvus } from 'langchain/vectorstores/milvus'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { flatten } from 'lodash'
import { RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams } from 'langchain/text_splitter'
import { DynamicTool } from 'langchain/tools'
import { createRetrieverTool } from 'langchain/agents/toolkits'
import { BaseRetriever } from 'langchain/schema/retriever'

class Milvus_Upsert_VectorStores implements INode {
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
        this.label = 'Insert Document'
        this.name = 'milvusUpsert'
        this.version = 1.0
        this.type = 'Milvus'
        this.icon = 'collection.svg'
        this.category = 'Collections'
        this.description = 'Add data to one of your collections!'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
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
                label: 'Server URL',
                name: 'milvusServerUrl',
                type: 'string',
                placeholder: 'http://localhost:19530'
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
        const address = nodeData.inputs?.milvusServerUrl as string
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
            collectionName: collectionName
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

function checkJsonString(value: string): { isJson: boolean; obj: any } {
    try {
        const result = JSON.parse(value)
        return { isJson: true, obj: result }
    } catch (e) {
        return { isJson: false, obj: null }
    }
}

interface InsertRow {
    [x: string]: string | number[]
}

function createFieldTypeForMetadata(documents: any, primaryFieldName: any) {
    const sampleMetadata = documents[0].metadata
    let textFieldMaxLength = 16535
    let jsonFieldMaxLength = 16535
    documents.forEach(({ metadata }: { metadata: any }) => {
        // check all keys name and count in metadata is same as sampleMetadata
        Object.keys(metadata).forEach((key) => {
            if (!(key in metadata) || typeof metadata[key] !== typeof sampleMetadata[key]) {
                throw new Error('All documents must have same metadata keys and datatype')
            }
            // find max length of string field and json field, cache json string value
            if (typeof metadata[key] === 'string') {
                if (metadata[key].length > textFieldMaxLength) {
                    textFieldMaxLength = metadata[key].length
                }
            } else if (typeof metadata[key] === 'object') {
                const json = JSON.stringify(metadata[key])
                if (json.length > jsonFieldMaxLength) {
                    jsonFieldMaxLength = json.length
                }
            }
        })
    })
    const fields = []
    for (const [key, value] of Object.entries(sampleMetadata)) {
        const type = typeof value
        if (key === primaryFieldName) {
            /**
             * skip primary field
             * because we will create primary field in createCollection
             *  */
        } else if (type === 'string') {
            fields.push({
                name: key,
                description: `Metadata String field`,
                data_type: DataType.VarChar,
                type_params: {
                    max_length: textFieldMaxLength.toString()
                }
            })
        } else if (type === 'number') {
            fields.push({
                name: key,
                description: `Metadata Number field`,
                data_type: DataType.Float
            })
        } else if (type === 'boolean') {
            fields.push({
                name: key,
                description: `Metadata Boolean field`,
                data_type: DataType.Bool
            })
        } else if (value === null) {
            // skip
        } else {
            // use json for other types
            try {
                fields.push({
                    name: key,
                    description: `Metadata JSON field`,
                    data_type: DataType.VarChar,
                    type_params: {
                        max_length: jsonFieldMaxLength.toString()
                    }
                })
            } catch (e) {
                throw new Error('Failed to parse metadata field as JSON')
            }
        }
    }
    return fields
}

function getVectorFieldDim(vectors: any) {
    if (vectors.length === 0) {
        throw new Error('No vectors found')
    }
    return vectors[0].length
}

class MilvusUpsert extends Milvus {
    async createCollection(vectors: any, documents: any) {
        const fieldList = []
        fieldList.push(...createFieldTypeForMetadata(documents, this.primaryField))
        fieldList.push(
            {
                name: this.primaryField,
                description: 'Primary key',
                data_type: DataType.Int64,
                is_primary_key: true,
                autoID: this.autoId
            },
            {
                name: this.textField,
                description: 'Text field',
                data_type: DataType.VarChar,
                type_params: {
                    max_length: (16535).toString()
                }
            },
            {
                name: this.vectorField,
                description: 'Vector field',
                data_type: DataType.FloatVector,
                type_params: {
                    dim: getVectorFieldDim(vectors).toString()
                }
            }
        )
        fieldList.forEach((field) => {
            if (!(field as any).autoID) {
                this.fields.push(field.name)
            }
        })
        const createRes = await this.client.createCollection({
            collection_name: this.collectionName,
            fields: fieldList
        })
        if (createRes.error_code !== ErrorCode.SUCCESS) {
            throw new Error(`Failed to create collection: ${createRes}`)
        }
        await this.client.createIndex({
            collection_name: this.collectionName,
            field_name: this.vectorField,
            extra_params: this.indexCreateParams
        })
    }

    async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
        this.textFieldMaxLength = 65535

        if (vectors.length === 0) {
            return
        }
        await this.ensureCollection(vectors, documents)
        const insertDatas: InsertRow[] = []

        for (let index = 0; index < vectors.length; index++) {
            const vec = vectors[index]
            const doc = documents[index]
            const data: InsertRow = {
                [this.textField]: doc.pageContent,
                [this.vectorField]: vec
            }
            this.fields.forEach((field) => {
                switch (field) {
                    case this.primaryField:
                        if (!this.autoId) {
                            if (doc.metadata[this.primaryField] === undefined) {
                                throw new Error(
                                    `The Collection's primaryField is configured with autoId=false, thus its value must be provided through metadata.`
                                )
                            }
                            data[field] = doc.metadata[this.primaryField]
                        }
                        break
                    case this.textField:
                        data[field] = doc.pageContent
                        break
                    case this.vectorField:
                        data[field] = vec
                        break
                    default: // metadata fields
                        if (doc.metadata[field] === undefined) {
                            throw new Error(`The field "${field}" is not provided in documents[${index}].metadata.`)
                        } else if (typeof doc.metadata[field] === 'object') {
                            data[field] = JSON.stringify(doc.metadata[field])
                        } else {
                            data[field] = doc.metadata[field]
                        }
                        break
                }
            })

            insertDatas.push(data)
        }

        const descIndexResp = await this.client.describeIndex({
            collection_name: this.collectionName
        })

        if (descIndexResp.status.error_code === ErrorCode.IndexNotExist) {
            const resp = await this.client.createIndex({
                collection_name: this.collectionName,
                field_name: this.vectorField,
                index_name: `myindex_${Date.now().toString()}`,
                index_type: IndexType.AUTOINDEX,
                metric_type: MetricType.L2
            })
            if (resp.error_code !== ErrorCode.SUCCESS) {
                throw new Error(`Error creating index`)
            }
        }

        const insertResp = await this.client.insert({
            collection_name: this.collectionName,
            fields_data: insertDatas
        })

        if (insertResp.status.error_code !== ErrorCode.SUCCESS) {
            throw new Error(`Error inserting data: ${JSON.stringify(insertResp)}`)
        }

        await this.client.flushSync({ collection_names: [this.collectionName] })
        await this.client.loadCollection({ collection_name: this.collectionName })
    }
}

module.exports = { nodeClass: Milvus_Upsert_VectorStores }
