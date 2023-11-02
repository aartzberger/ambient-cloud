import { ICommonObject, IAutomationNode, IAutomationNodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Response } from 'express'

const BASE_URL = process.env.BASE_URL || 'https://app-ambient.ngrok.app'

class ScheduleAutomation implements IAutomationNode {
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
        this.label = 'Schedule Automation'
        this.name = 'scheduleAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'schedule.svg'
        this.category = 'Automations'
        this.description = 'Runs the automation at a defined interval or time of day. There is no default handler so make sure to add one.'
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
                label: 'Fetch Interval',
                description: 'Interval (minutes) or time of day (HH:MM military) to run the automation.',
                name: 'triggerInterval',
                type: 'string',
                optional: false
            },
            {
                label: 'Pre-Defined Questions',
                name: 'definedQuestions',
                type: 'string',
                rows: 6,
                placeholder: `start each question with "-" and a space. For example: - What is 1 + 1?`,
                optional: false
            },
            {
                label: 'Automation URL - make POST requets to this URL to trigger the automation',
                name: 'automationUrl',
                type: 'uniqueUrl',
                default: BASE_URL + '/api/v1/automations/run/',
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
        // we will return a single string to force the automation to run. it will use the definedQuestions to run the automation
        return { status: true, output: [''], auxData: null }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, auxData: any) {
        // nothing to do here. there is no default handler

        return { status: true, output: 'ok' }
    }
}

module.exports = { nodeClass: ScheduleAutomation }
