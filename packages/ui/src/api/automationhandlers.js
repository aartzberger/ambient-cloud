import client from './client'

const getAllAutomationHandlers = () => client.get('/automation-handlers')

const getSpecificAutomationHandler = (id) => client.get(`/automation-handlers/${id}`)

const createNewAutomationHandler = (body) => client.post(`/automation-handlers`, body)

const updateAutomationHandler = (id, body) => client.put(`/automation-handlers/${id}`, body)

const deleteAutomationHandler = (id) => client.delete(`/automation-handlers/${id}`)

export default {
    getAllAutomationHandlers,
    getSpecificAutomationHandler,
    createNewAutomationHandler,
    updateAutomationHandler,
    deleteAutomationHandler
}
