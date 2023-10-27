import { INodeParams, INodeCredential } from '../src/Interface'

class SlackBotToken implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Slack Bot Token'
        this.name = 'slackBotToken'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Slack Bot Token',
                name: 'slackBotToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SlackBotToken }
