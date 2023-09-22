import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Document } from 'langchain/document'
import axios from 'axios'

class AmbientRetriever {
    url: string;
    args: {};
    inputKey: string;
    responseKey: string;
    pageContentKey: string;
    metadataKey: string;

    constructor(args: {}) {
        this.inputKey = "query";
        this.responseKey = "data";
        this.pageContentKey = "pageContent";
        this.metadataKey = "metadata";
    }

    processJsonResponse(json: any) {
        return json[this.responseKey].map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => new Document({
            pageContent: r[this.pageContentKey],
            metadata: r[this.metadataKey],
        }));
    }

    createJsonBody(query: string) {
        const q = {query: query}
        const commpleteBody = { ...this.args, ...q };

        return commpleteBody;
    }

    set_req_params(url: string, args: {}) {
        this.url = url
        this.args = args
    }

    async getRelevantDocuments(query: string) {
        const body = this.createJsonBody(query);
        const endpoint = '/api/v1/milvus/query-collection'
        
        let responseData;
        try {
            const response = await axios.post(this.url+endpoint, body);
            responseData = response.data;
        } catch (error) {
            // Axios throws an error for response codes outside the range of 2xx.
            // The error object has a 'response' field that contains the server's response.
            if (error.response) {
                throw new Error(`Failed to retrieve documents from ${this.url}: ${error.response.status} ${error.response.statusText}`);
            } else {
                throw error;  // Other errors, e.g. network issues, timeouts.
            }
        }
    
        return this.processJsonResponse(responseData);
    }
}

class Reference_Remote_VectorStores implements INode {
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
        this.label = 'Reference Remote Data'
        this.name = 'remoteReference'
        this.version = 1.0
        this.type = 'Remote'
        this.icon = 'milvus.svg'
        this.category = 'Databases'
        this.description = 'Reference data from your remote database (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Data Server URL',
                name: 'serverUrl',
                type: 'string',
                placeholder: '7.tcp.ngrok.io:27703',
                default: '7.tcp.ngrok.io:27703',
                optional: true
            },
            {
                label: 'Collection Name',
                name: 'dataCollection',
                type: 'string'
            }
        ]
        this.outputs = [
            {
                label: 'Data Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // server setup

        const retriever = new AmbientRetriever({})

        const address = nodeData.inputs?.serverUrl 
            ? nodeData.inputs.serverUrl as string 
            : nodeData.inputs?.default as string;
        const collectionName = nodeData.inputs?.dataCollection as string

        const topK = nodeData.inputs?.topK as string

        // format data
        const k = topK ? parseInt(topK, 10) : 10

        const args = {
            collection: collectionName,
            k: k,
        }

        retriever.url = address
        retriever.args = args

        return retriever
    }
}

module.exports = { nodeClass: Reference_Remote_VectorStores }
