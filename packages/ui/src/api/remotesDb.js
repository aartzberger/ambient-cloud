import client from './client'

const getUserCollections = (source) => client.get(`/collections/${source}`)
const querySpecificCollection = (source, name) => client.get(`/collections/query/${source}/${name}`)
const deleteCollection = (source, name) => client.delete(`/collections/delete/${source}/${name}`)
const updateCollection = (source, data) => client.post(`/collections/update/${source}`, data)
const createCollection = (source, data) => client.post(`/collections/create/${source}`, data)
const loadUnloadCollection = (source, data) => client.post(`/collections/load-unload/${source}`, data)
const deleteEntities = (source, data) => client.post(`/collections/entities/delete/${source}`, data)
const renameCollection = (source, data) => client.post(`/collections/rename/${source}`, data)

export default {
    getUserCollections,
    querySpecificCollection,
    deleteCollection,
    updateCollection,
    createCollection,
    loadUnloadCollection,
    deleteEntities,
    renameCollection
}
