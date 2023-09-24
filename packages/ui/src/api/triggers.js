import client from './client'

const getAllTriggers = () => client.get('/triggers')

const getSpecificTrigger = (id) => client.get(`/triggers/${id}`)

const createNewTrigger = (body) => client.post(`/triggers`, body)

const updateTrigger = (id, body) => client.put(`/triggers/${id}`, body)

const deleteTrigger = (id) => client.delete(`/triggers/${id}`)

export default {
    getAllTriggers,
    getSpecificTrigger,
    createNewTrigger,
    updateTrigger,
    deleteTrigger
}
