import { DataSource } from 'typeorm'
import { User } from '../database/entities/User'
import { RemoteDb } from '../database/entities/RemoteDb'

const defaultAddress = process.env.MILVUS_CLOUD_URL || 'vectordb:19530' // vectordb will be container name on same aws network

// ----------------------------
// The following are functions used to help connect to milvus database
// ----------------------------

export const getDbAddress = async (user: User, source: string, dataSource: DataSource) => {
    if (source === 'cloud') {
        return defaultAddress
    } else if (source === 'local') {
        const remoteData = await dataSource.getRepository(RemoteDb).findOneBy({
            user: user as User
        })
        return remoteData?.url
    } else {
        return null
    }
}

export const getCollectionName = (user: User, name: string, source: string) => {
    if (source === 'cloud') {
        return `${name}_${String(user.id).replace(/-/g, '_')}`
    } else {
        return name
    }
}
