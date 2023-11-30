import { ICommonObject, IAutomationNode, IAutomationNodeData, INodeOutputsValue, INodeParams, DeployedUrl } from '../../../src/Interface'
import { Response } from 'express'

class RequestPostAutomation implements IAutomationNode {
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
        this.label = 'Post Request Automation'
        this.name = 'postRequestAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'requestspost.svg'
        this.category = 'Automations'
        this.description =
            'Handles a POST request to a URL and returns the automation output to the caller. You can specify the input and output keys in the request and response bodies.'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Automation Enabled',
                name: 'automationEnabled',
                type: 'boolean',
                default: false,
                optional: true
            },
            {
                label: 'Automation Name',
                name: 'automationName',
                type: 'string',
                optional: false
            },
            {
                label: 'Input Key',
                name: 'inputKey',
                type: 'string',
                optional: false
            },
            {
                label: 'Output Key',
                name: 'outputKey',
                type: 'string',
                optional: false
            },
            {
                label: 'Pre-Defined Questions',
                name: 'definedQuestions',
                type: 'string',
                rows: 6,
                placeholder: `start each question with "-" and a space. For example: - What is 1 + 1?`,
                additionalParams: true
            },
            {
                label: 'Automation URL - make POST requets to this URL to trigger the automation',
                name: 'automationUrl',
                type: 'uniqueUrl',
                default: DeployedUrl + '/api/v1/automations/run/',
                additionalParams: true,
                optional: true,
                disabled: true
            }
        ]
    }

    async init(nodeData: IAutomationNodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runTrigger(nodeData: IAutomationNodeData, body: any, res: Response) {
        // return the base input
        const inputKey = nodeData.inputs?.inputKey

        return { status: true, output: body[inputKey] as string, auxData: null }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, auxData: any) {
        // return the base input
        const outputKey = nodeData.inputs?.outputKey

        const responseObj: any = {}
        responseObj[outputKey] = output

        // return the output
        res.json(responseObj)

        return { status: true, output: 'ok' }
    }
}

module.exports = { nodeClass: RequestPostAutomation }
