import client from './client'

const getAllChatflowsMarketplaces = () => client.get('/marketplaces/chatflows')
const getAllToolsMarketplaces = () => client.get('/marketplaces/tools')
const getAllTriggersMarketplaces = () => client.get('/marketplaces/triggers')
const getAllHandlersMarketplaces = () => client.get('/marketplaces/handlers')

export default {
    getAllChatflowsMarketplaces,
    getAllToolsMarketplaces,
    getAllTriggersMarketplaces,
    getAllHandlersMarketplaces
}
