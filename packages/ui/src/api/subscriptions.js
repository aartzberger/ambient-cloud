import client from './client'

const getSubscriptionOptions = () => client.get('/subscriptions')

const postSubscriptionCheckoutSession = (data) => client.post('/subscriptions/checkout', data)

export default {
    getSubscriptionOptions,
    postSubscriptionCheckoutSession
}
