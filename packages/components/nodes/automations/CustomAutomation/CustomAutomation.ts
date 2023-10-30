import {
    ICommonObject,
    IDatabaseEntity,
    IAutomationNode,
    IAutomationNodeData,
    INodeOutputsValue,
    INodeOptionsValue,
    INodeParams
} from '../../../src/Interface'
import { DataSource } from 'typeorm'
import { Request } from 'express'

const BASE_URL = process.env.BASE_URL || 'https://flow-ambient.ngrok.app'

class CustomAutomation implements IAutomationNode {
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
        this.label = 'Custom Automation'
        this.name = 'customAutomation'
        this.version = 1.0
        this.type = 'Automation'
        this.icon = 'automation.svg'
        this.category = 'Automations'
        this.description = 'Automate when and how your model runs. Simply place on canvas and "Configure" to get started.'
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
                label: 'Trigger',
                name: 'selectedTrigger',
                type: 'asyncOptions',
                loadMethod: 'listTriggers',
                additionalParams: true,
                optional: false
            },
            {
                label: 'Handler',
                name: 'selectedHandler',
                type: 'asyncOptions',
                loadMethod: 'listHandlers',
                additionalParams: true,
                optional: false
            },
            {
                label: 'Trigger Interval',
                name: 'triggerInterval',
                type: 'number',
                default: 0,
                additionalParams: true,
                optional: true
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
                default: BASE_URL + '/api/v1/automations/run/',
                additionalParams: true,
                optional: true,
                disabled: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listTriggers(_: IAutomationNodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }
            const triggers = await appDataSource.getRepository(databaseEntities['Trigger']).findBy({
                user: options.user
            })

            for (let trigger of triggers) {
                const data = {
                    label: trigger.name,
                    name: trigger.id
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        },
        async listHandlers(_: IAutomationNodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }
            const handlers = await appDataSource.getRepository(databaseEntities['AutomationHandler']).findBy({
                user: options.user
            })

            for (let handler of handlers) {
                const data = {
                    label: handler.name,
                    name: handler.id
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: IAutomationNodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do. this is handled by automation trigger/handler
    }
}

module.exports = { nodeClass: CustomAutomation }
