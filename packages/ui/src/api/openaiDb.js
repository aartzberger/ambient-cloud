import client from './client'

const getUserCollections = () => client.get('/openai-collections')
const createCollection = (name, data) => client.post(`/openai-collection/${name}`, data)
const deleteCollection = (name) => client.get(`/delete-openai-collection/${name}`)
const getSpecificCollection = (name) => client.get(`/openai-collections/${name}`)
const renameCollection = (data) => client.post(`/rename-openai-collection`, data)
const deleteEntities = (data) => client.post(`/delete-openai-entities`, data)

export default {
    getUserCollections,
    createCollection,
    deleteCollection,
    getSpecificCollection,
    renameCollection,
    deleteEntities
}
