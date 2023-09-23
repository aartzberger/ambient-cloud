import client from './client'

const getAllAutomations = () => client.get('/automations/all')
const getAllActions = () => client.get('/automations/actions')

export default {
    getAllAutomations,
    getAllActions
}
