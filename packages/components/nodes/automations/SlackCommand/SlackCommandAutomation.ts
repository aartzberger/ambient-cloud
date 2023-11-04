import { ICommonObject, IAutomationNode, IAutomationNodeData, INodeOutputsValue, INodeParams, DeployedUrl } from '../../../src/Interface'
import { Response } from 'express'


class SlackCommandAutomation implements IAutomationNode {
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
        this.label = 'Slack Command Automation'
        this.name = 'slackCommandAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'slack.svg'
        this.category = 'Automations'
        this.description =
            'Handles responses to a Slack /Command. The default handler replies to the command URL provided by slack. Make sure to add the automation URL to your Slack /command app.'
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

    async runTrigger(nodeData: IAutomationNodeData, body: any, res: Response, options: ICommonObject) {
        // let slack know the request was received
        res.status(200).send()

        // return the base input
        return { status: true, output: body.text as string, auxData: null }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, options: ICommonObject, auxData: any) {
        // import required lib for sending url response
        const axios = require('axios')

        // parse the url that we want to respond to
        const url = body.response_url

        // create data to send to url and forward it
        const out = await axios.post(url, { text: output })

        return { status: true, output: out as string }
    }
}

module.exports = { nodeClass: SlackCommandAutomation }
