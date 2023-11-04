import axios from 'axios'
import { DeployedUrl } from '../../../src/Interface'

export interface AgentToolParams {
    id: string
    data: string
}

export const agentToolRequest = async (params: AgentToolParams) => {
    const endpoint = `${DeployedUrl}/api/v1/internal-prediction/${params.id}`

    try {
        const response = await axios.post(endpoint, { question: params.data }) // If 'arg' needs to be sent as the POST body
        // If the response is JSON and you want to convert it to a string
        return JSON.stringify(response.data)
    } catch (error) {
        // Handle error appropriately
        console.error('Error making the POST request:', error)
        throw error // or return a default value
    }
}
