import { IAutomationNode, ICommonObject, IAutomationNodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, updateAutomation } from '../../../src/utils'
import { nanoid } from 'nanoid'
import { Response } from 'express'
import { getUnreadMessages, getMessageDetails, findPlainTextPart, getSenderAddress, sendEmail } from './core'

const BASE_URL = process.env.BASE_URL || 'https://flow-ambient.ngrok.app'

const makeUniqueUrl = () => {
    const uniqueId = nanoid()
    const url = uniqueId
    return url
}

type Email = {
    id: string
    threadId: string
}

class GmailAutomation implements IAutomationNode {
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
        this.type = 'Automation'
        this.icon = 'google.svg'
        this.category = 'Automations'
        this.description = 'Automated response to Gmail emails. Default handler replies to sender of the email.'
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
                label: 'Response Subject',
                name: 'responseSubject',
                type: 'string',
                default: 'Thanks for your email!',
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

    async init(nodeData: IAutomationNodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runTrigger(nodeData: IAutomationNodeData, body: any, res: Response, options: ICommonObject) {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        let { accessToken, refreshToken } = getCredentialParam('googleApiKey', credentialData, nodeData)

        const cache = nodeData.automationData?.cache ? JSON.parse(nodeData.automationData?.cache) : {}

        const mailbox = (nodeData.inputs?.monitoredMailbox as string).toLowerCase()

        const emails = await getUnreadMessages(accessToken, mailbox, nodeData.credential || '')

        if (!(cache as any).emails && emails?.length) {
            // if ne emails list is cached, cache the emails so we can check for new emails next time
            nodeData.automationData.cache = JSON.stringify({ emails: emails })
            // add the cache to the automation and save to database
            updateAutomation(nodeData.automationData)

            return { status: false, output: 'No new emails', auxData: null }
        }

        // if we have cached emails, get the list of new emails since the last time we checked
        const cachedEmails = (cache as any).emails
        const oldEmailIdsSet = new Set(cachedEmails.map((email: Email) => email.id))
        // update the list of truly new emails
        const trulyNewEmails = emails?.filter((email: Email) => !oldEmailIdsSet.has(email.id))

        // update the automation cache
        nodeData.automationData.cache = JSON.stringify({ emails: emails })
        updateAutomation(nodeData.automationData)

        if (trulyNewEmails?.length) {
            const toSendIds = []
            const messages = []
            for (const newEmail of trulyNewEmails) {
                const message = await getMessageDetails(accessToken, (newEmail as Email).id)
                const messageText = findPlainTextPart(message)
                if (messageText) {
                    toSendIds.push({
                        id: (newEmail as Email).id,
                        threadId: (newEmail as Email).threadId,
                        sender: getSenderAddress(message)
                    })
                    messages.push(messageText)
                }
            }

            if (messages.length) {
                return { status: true, output: messages, auxData: toSendIds }
            } else {
                return { status: false, output: 'Could not parse email message text.', auxData: null }
            }
        }

        return { status: false, output: 'No new emails', auxData: null }
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, body: any, res: Response, options: ICommonObject, auxData: any) {
        // since we already ran this with trigger, it should not need to be refreshed
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        let { accessToken, refreshToken } = getCredentialParam('googleApiKey', credentialData, nodeData)

        // get the response subject defined by the user in node input
        const responseSubject = nodeData.inputs?.responseSubject || 'Thanks for your email!'

        const toSendEmail = auxData.sender
        const threadId = auxData.threadId

        // send the email if its not from donotreply address
        if (!toSendEmail.includes('donotreply')) {
            const response = await sendEmail(nodeData.credential as string, accessToken, toSendEmail, responseSubject, output, threadId)
        }

        return { status: true, output: 'Email sent' }
    }
}

module.exports = { nodeClass: GmailAutomation }
