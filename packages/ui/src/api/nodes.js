import client from './client'

const getAllNodes = () => client.get('/nodes')
const getAllComplete = () => client.get('/nodes/complete')

const getSpecificNode = (name) => client.get(`/nodes/${name}`)

export default {
    getAllNodes,
    getSpecificNode,
    getAllComplete
}
