import client from './client'

const getUserClientEndpoint = () => client.get('/user-client-endpoint')
const getUserMilvusEndpoint = () => client.get('/user-milvus-endpoint')
const getUserCollections = () => client.get('/milvus-collections')
const querySpecificCollection = (name) => client.get(`/milvus-query/${name}`)
const getSpecificCollection = (name) => client.get(`/milvus-collections/${name}`)
const deleteCollection = (name) => client.get(`/delete-collection/${name}`)
const updateCollection = (name, data) => client.post(`/update-collection/${name}`, data)
const createCollection = (name, data) => client.post(`/create-collection/${name}`, data)
const loadUnloadCollection = (name, data) => client.post(`/load-unload-collection`, data)
const deleteEntities = (data) => client.post(`/milvus-delete-entities`, data)
const renameCollection = (data) => client.post(`/rename-collection`, data)

export default {
    getUserClientEndpoint,
    getUserMilvusEndpoint,
    getUserCollections,
    querySpecificCollection,
    getSpecificCollection,
    deleteCollection,
    updateCollection,
    createCollection,
    loadUnloadCollection,
    deleteEntities,
    renameCollection
}
