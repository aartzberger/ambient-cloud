import { ICommonObject, IAutomationNode, IAutomationNodeData, INodeOutputsValue, INodeParams, DeployedUrl } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { Response } from 'express'
import { WebClient } from '@slack/web-api'


class SlackEventAutomation implements IAutomationNode {
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
        this.label = 'Slack Event Automation'
        this.name = 'slackEventAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'slack.svg'
        this.category = 'Automations'
        this.description =
            'Handles responses to a Slack Event. Defualt handler replis to the originating Slack thread. Make sure to configure the event and add automation URL to Slack app.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Slack Bot Token',
            name: 'credential',
            type: 'credential',
            credentialNames: ['slackBotToken']
        }
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
        const challenge = body.challenge || null

        try {
            if (challenge) {
                res.status(200).send({ challenge: challenge })
            } else {
                res.status(200).send('ok')
            }

            // return the base input
            return { status: true, output: body.event.text, auxData: null }
        } catch (error) {
            return { status: false, output: error, auxData: null }
        }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, options: ICommonObject, auxData: any) {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const token = getCredentialParam('slackBotToken', credentialData, nodeData)

        const client = new WebClient(token)

        try {
            // Call the chat.postMessage method using the WebClient
            const result = await client.chat.postMessage({
                channel: body.event.channel,
                text: output,
                thread_ts: body.event.ts
            })
        } catch (error) {
            console.error(error)
        }

        return { status: true, output: 'ok' }
    }
}

module.exports = { nodeClass: SlackEventAutomation }
