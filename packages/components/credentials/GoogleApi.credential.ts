import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Api'
        this.name = 'googleApi'
        this.version = 1.0
        this.description = 'Anables interraction with Google API. Apps include GMail, Google Drive, Google Calendar, Google Sheets, etc.'
        this.inputs = [
            {
                label: 'Google API Key',
                name: 'googleApiKey',
                type: 'googleOauth2'
            }
        ]
    }

    // Define the function to be called later
    handleClick() {
        console.log('Button clicked!')
    }
}

module.exports = { credClass: GoogleApi }
