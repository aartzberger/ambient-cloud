import { DataSource, DeleteResult } from 'typeorm'
import { ApiKey } from '../database/entities/ApiKey'
import { User } from '../database/entities/User'
import { getDataSource } from '../DataSource'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const dataSource = getDataSource()

/**
 * Generate the api key
 * @returns {string}
 */
export const generateAPIKey = (): string => {
    const buffer = randomBytes(32)
    return buffer.toString('base64')
}

/**
 * Generate the secret key
 * @param {string} apiKey
 * @returns {string}
 */
export const generateSecretHash = (apiKey: string): string => {
    const salt = randomBytes(8).toString('hex')
    const buffer = scryptSync(apiKey, salt, 64) as Buffer
    return `${buffer.toString('hex')}.${salt}`
}

/**
 * Verify valid keys
 * @param {string} storedKey
 * @param {string} suppliedKey
 * @returns {boolean}
 */
export const compareKeys = (storedKey: string, suppliedKey: string): boolean => {
    const [hashedPassword, salt] = storedKey.split('.')
    const buffer = scryptSync(suppliedKey, salt, 64) as Buffer
    return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer)
}

/**
 * Get API keys
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<ApiKey[]>}
 */
export const getAPIKeys = async (user: User, dataSource: DataSource): Promise<ApiKey[]> => {
    const keys = await dataSource.getRepository(ApiKey).find({
        where: { user: user }
    })

    return keys
}

/**
 * Add new API key
 * @param {string} keyName
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<ICommonObject[]>}
 */
export const addAPIKey = async (keyName: string, user: User, dataSource: DataSource): Promise<ApiKey> => {
    const apiKey = generateAPIKey()
    const apiSecret = generateSecretHash(apiKey)
    const keyData = {
        keyName: keyName,
        apiKey: apiKey,
        apiSecret: apiSecret
    }

    const newApiKey = new ApiKey()
    Object.assign(newApiKey, keyData)
    newApiKey.user = user

    const tool = dataSource.getRepository(ApiKey).create(newApiKey)
    const results = await dataSource.getRepository(ApiKey).save(tool)

    return results
}

/**
 * Get API Key details
 * @param {string} apiKey
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<ApiKey>}
 */
export const getApiKey = async (apiKey: string, user: User, dataSource: DataSource) => {
    const key = await dataSource.getRepository(ApiKey).findOneBy({
        user: user,
        apiKey: apiKey
    })

    return key
}

/**
 * Update existing API key
 * @param {string} apiKeyId
 * @param {string} newKeyName
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<ApiKey | null>}
 */
export const updateAPIKey = async (apiKeyId: string, newKeyName: string, user: User, dataSource: DataSource): Promise<ApiKey | null> => {
    const key = await dataSource.getRepository(ApiKey).findOneBy({
        id: apiKeyId,
        user: user
    })

    if (!key) {
        return null
    }

    const newKeyData = {
        keyName: newKeyName,
        apiKey: key.apiKey,
        apiSecret: key.apiSecret
    }
    const updatedApiKey = new ApiKey()
    Object.assign(updatedApiKey, newKeyData)

    dataSource.getRepository(ApiKey).merge(key, updatedApiKey)
    const result = await dataSource.getRepository(ApiKey).save(key)

    return result
}

/**
 * Delete API key
 * @param {string} apiKeyId
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<DeleteResult>}
 */
export const deleteAPIKey = async (apiKeyId: string, user: User, dataSource: DataSource): Promise<DeleteResult> => {
    const results = await dataSource.getRepository(ApiKey).delete({ id: apiKeyId, user: user })

    return results
}

/**
 * Replace all api keys
 * @param {User} user
 * @param {DataSource} dataSource
 * @returns {Promise<void>}
 */
export const replaceAllAPIKeys = async (user: User, dataSource: DataSource): Promise<void> => {
    const results = await dataSource.getRepository(ApiKey).delete({ user: user })
}
