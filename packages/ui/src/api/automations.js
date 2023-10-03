import client from './client'

const getAllAutomations = () => client.get('/automations')

const getSpecificAutomation = (id) => client.get(`/automations/${id}`)

const createOrUpdateAutomation = (chatflowid, body) => client.post(`/automations/${chatflowid}`, body)

const deleteAutomation = (id) => client.delete(`/automations/${id}`)

export default {
    getAllAutomations,
    getSpecificAutomation,
    createOrUpdateAutomation,
    deleteAutomation
}
