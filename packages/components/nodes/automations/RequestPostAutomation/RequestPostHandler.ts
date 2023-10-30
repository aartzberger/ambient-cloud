import { IHandlerNode, ICommonObject, IAutomationNodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import axios from 'axios'

class RequestPostHandler implements IHandlerNode {
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
        this.label = 'Send POST Request'
        this.name = 'postRequestHandler'
        this.version = 1.0
        this.type = 'Handler'
        this.icon = 'requestspost.svg'
        this.category = 'Handlers'
        this.description = 'Send a POST request to a URL.'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Automation',
                name: 'handlerAutomation',
                type: 'Automation',
                optional: false
            },
            {
                label: 'POST URL',
                name: 'postUrl',
                type: 'string',
                optional: false
            },
            {
                label: 'Response Key',
                name: 'responseKey',
                type: 'string',
                optional: false
            }
        ]
    }

    async init(nodeData: IAutomationNodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, options: ICommonObject) {
        const url = nodeData.inputs?.postUrl
        const responseKey = nodeData.inputs?.responseKey

        try {
            const response = await axios.post(url, { [responseKey]: output })

            return { status: true, output: 'POST reqeust sent' }
        } catch (error) {
            return { status: false, output: error }
        }
    }
}

module.exports = { nodeClass: RequestPostHandler }
