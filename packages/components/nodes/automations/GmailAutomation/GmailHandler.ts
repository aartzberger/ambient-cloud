import { IHandlerNode, ICommonObject, IAutomationNodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { sendEmail } from './core'

class GmailHandler implements IHandlerNode {
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
        this.label = 'Send Email with Gmail'
        this.name = 'gmailHandler'
        this.version = 1.0
        this.type = 'Handler'
        this.icon = 'google.svg'
        this.category = 'Handlers'
        this.description = 'Send the output of a model automation to an email address.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleApi']
        }
        this.inputs = [
            {
                label: 'Automation',
                name: 'handlerAutomation',
                type: 'Automation',
                optional: false
            },
            {
                label: 'Send to Email',
                name: 'sendToEmail',
                type: 'string',
                optional: false
            },
            {
                label: 'Response Subject',
                name: 'responseSubject',
                type: 'string',
                optional: false
            }
        ]
    }

    async init(nodeData: IAutomationNodeData, _: string, options: ICommonObject): Promise<any> {
        // nothing to do here
    }

    async runHandler(nodeData: IAutomationNodeData, output: string, options: ICommonObject) {
        // since we already ran this with trigger, it should not need to be refreshed
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        let { accessToken, refreshToken } = getCredentialParam('googleApiKey', credentialData, nodeData)

        // get the response subject defined by the user in node input
        const responseSubject = nodeData.inputs?.responseSubject || 'Thanks for your email!'

        const toSendEmail = nodeData.inputs?.sendToEmail

        // send the email if its not from donotreply address
        const response = await sendEmail(nodeData.credential as string, accessToken, toSendEmail, responseSubject, output)

        return { status: true, output: 'Email sent' }
    }
}

module.exports = { nodeClass: GmailHandler }
