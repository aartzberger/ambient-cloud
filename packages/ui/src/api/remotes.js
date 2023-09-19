import client from './client'

const getUserClientEndpoint = () => client.get('/user-client-endpoint')
const getUserMilvusEndpoint = () => client.get('/user-milvus-endpoint')

export default {
    getUserClientEndpoint,
    getUserMilvusEndpoint
}
