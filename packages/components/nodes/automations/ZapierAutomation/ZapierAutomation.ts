import { ICommonObject, IAutomationNode, IAutomationNodeData, INodeOutputsValue, INodeParams, DeployedUrl } from '../../../src/Interface'
import { Response } from 'express'


class ZapierAutomation implements IAutomationNode {
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
        this.label = 'Zapier Automation'
        this.name = 'zapierAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'zapier.svg'
        this.category = 'Automations'
        this.description =
            'Handles request from Zapier. Default handler sends response back to Zapier. Make sure to configure the zap on Zapier.'
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
        return { status: true, output: body.input as string, auxData: null }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, auxData: any) {
        // return the output to zapier
        res.status(200).send({ output: output })

        return { status: true, output: 'ok' }
    }
}

module.exports = { nodeClass: ZapierAutomation }
