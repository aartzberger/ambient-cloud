import client from './client'

const getUserClientEndpoint = () => client.get('/user-client-endpoint')
const getUserMilvusEndpoint = () => client.get('/user-milvus-endpoint')
const getUserCollections = () => client.get('/milvus-collections')
const getSpecificCollection = (name) => client.get(`/milvus-collections/${name}`)

export default {
    getUserClientEndpoint,
    getUserMilvusEndpoint,
    getUserCollections,
    getSpecificCollection
}
