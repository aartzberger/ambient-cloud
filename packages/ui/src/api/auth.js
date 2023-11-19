import client from './client'

const loginUser = (data) => client.post('/login', data)

export default {
    loginUser
}
