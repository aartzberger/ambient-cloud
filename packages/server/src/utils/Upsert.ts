import { Document } from 'langchain/document'
import { Milvus } from 'langchain/vectorstores/milvus'

import { ErrorCode, MetricType, IndexType, DataType } from '@zilliz/milvus2-sdk-node'

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
                },
                is_partition_key: key === 'partition' ? true : false
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

export default MilvusUpsert
