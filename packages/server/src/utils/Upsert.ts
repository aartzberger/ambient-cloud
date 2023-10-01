import { Document } from 'langchain/document'
import { Milvus } from 'langchain/vectorstores/milvus'
import { ErrorCode, MetricType, IndexType } from '@zilliz/milvus2-sdk-node'

interface InsertRow {
    [x: string]: string | number[]
}

class MilvusUpsert extends Milvus {
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

        if (descIndexResp.status.error_code === ErrorCode.INDEX_NOT_EXIST) {
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
    }
}

export default MilvusUpsert
