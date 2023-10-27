import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { nanoid } from 'nanoid'
import { Response } from 'express'

const BASE_URL = process.env.BASE_URL || 'https://flow-ambient.ngrok.app'

const makeUniqueUrl = () => {
    const uniqueId = nanoid()
    const url = uniqueId
    return url
}

class SlackCommandAutomation implements INode {
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
        this.type = 'SlackCommandAutomation'
        this.icon = 'slack.svg'
        this.category = 'Automations'
        this.description = 'Handles responses to a Slack /Command. Add the automation URL to your Slack /command app.'
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
                type: 'string',
                default: BASE_URL + '/api/v1/automations/run/' + makeUniqueUrl(),
                additionalParams: true,
                optional: true,
                disabled: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runTrigger(body: any, res: Response) {
        // let slack know the request was received
        res.status(200).send()

        // return the base input
        return body.text as string
    }

    async runHandler(output: string, body: any, res: Response) {
        // import required lib for sending url response
        const axios = require('axios')

        // parse the url that we want to respond to
        const url = body.response_url

        // create data to send to url and forward it
        const out = await axios.post(url, { text: output })

        return out as string
    }
}

module.exports = { nodeClass: SlackCommandAutomation }
