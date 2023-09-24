import client from './client'

const getAllAutomations = () => client.get('/automations')

const getSpecificAutomation = (id) => client.get(`/automations/${id}`)

const createNewAutomation = (body) => client.post(`/automations`, body)

const updateAutomation = (id, body) => client.put(`/automations/${id}`, body)

const deleteAutomation = (id) => client.delete(`/automations/${id}`)

export default {
    getAllAutomations,
    getSpecificAutomation,
    createNewAutomation,
    updateAutomation,
    deleteAutomation
}
