import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { DataSource } from 'typeorm'
import { Request } from 'express'
import { nanoid } from 'nanoid'
import { Response } from 'express'

const BASE_URL = process.env.BASE_URL || 'https://flow-ambient.ngrok.app'

const makeUniqueUrl = () => {
    const uniqueId = nanoid()
    const url = uniqueId
    return url
}

class GmailAutomation implements INode {
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
        this.label = 'Gmail Automation'
        this.name = 'gmailAutomation'
        this.version = 1.0
        this.type = 'GmailAutomation'
        this.icon = 'google.svg'
        this.category = 'Automations'
        this.description = 'Automate when and how your model runs. Simply place on canvas and "Configure" to get started.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleApi']
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
                label: 'Fetch Interval',
                name: 'triggerInterval',
                type: 'number',
                default: 0,
                optional: true
            },
            {
                label: 'Monitored Mailbox',
                name: 'monitoredMailbox',
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

    //@ts-ignore
    loadMethods = {
        async listTriggers(_: INodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
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
        async listHandlers(_: INodeData, options: ICommonObject, req: Request): Promise<INodeOptionsValue[]> {
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runTrigger( body: any, res: Response) {
        return 'trigger'
    }

    async runHandler(output: string, body: any, res: Response) {
        return 'handler'
    }
}

module.exports = { nodeClass: GmailAutomation }
