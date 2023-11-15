import OpenAI from 'openai'
import { User } from '../database/entities/User'
import { getFileName } from '../utils/DocsLoader'
import { Collection } from '../database/entities/Collection'
import { DataSource } from 'typeorm'

// TODO CMAN - right now collections are sorted by file name with includes on the user id and collection name
// this is not a good way to do this, but it works for now
// any time a collecgtion is queried, it will return all files that include the collection name and user id
// sorting through these is O(n) and will get worse as more files are added

export const checkAssistantFiles = (allFiles: any[]) => {
    const uniqueFiles = allFiles.reduce((unique: [any], file: any) => {
        if (!unique.find((f: any) => f.langchain_primaryid === file.langchain_primaryid)) {
            unique.push(file)
        }
        return unique
    }, [])

    return uniqueFiles
}

export class OpenAiFiles {
    private client: OpenAI

    constructor(apiKey: string | null = null) {
        const key = apiKey || process.env.OPENAI_API_KEY
        this.client = new OpenAI({ apiKey: key })
    }

    async createCollection(user: User, name: string, files: [], dataSource: DataSource) {
        const createdFiles = await this.addFiles(user, name, files, dataSource)

        // check if the collection already exists
        const existingCollection = await dataSource.getRepository(Collection).findOneBy({
            user: user,
            name: name,
        })

        if (existingCollection) {
            return await this.updateCollection(user, name, dataSource)
        }

        const fileList = createdFiles.map((file: any) => {
            return { fileName: file.filename, langchain_primaryid: file.id }
        })

        const obj = { name: name, files: JSON.stringify(fileList), type: 'openai' }

        const newCol = new Collection()
        Object.assign(newCol, obj)
        newCol.user = user as User

        const col = dataSource.getRepository(Collection).create(newCol)
        const results = await dataSource.getRepository(Collection).save(col)

        return results
    }

    async updateCollection(user: User, name: string, dataSource: DataSource) {
        const col = await dataSource.getRepository(Collection).findOneBy({
            user: user,
            name: name
        })

        if (!col) {
            return null
        }

        const obj = {
            name: name,
            files: JSON.stringify((await this.getFiles(user, name)).data),
            type: 'openai'
        }

        const updateCol = new Collection()
        Object.assign(updateCol, obj)
        updateCol.user = user as User

        dataSource.getRepository(Collection).merge(col, updateCol)
        const result = await dataSource.getRepository(Collection).save(col)

        return result
    }

    async deleteCollection(user: User, name: string, dataSource: DataSource) {
        const files = await this.client.files.list()

        const collectionFiles = []
        for (const f of Array.from(files.data)) {
            if (f.filename.includes(name) && f.filename.includes(String(user.id))) {
                collectionFiles.push(f.id)
            }
        }

        const deletedFiles = await this.deleteFiles(user, name, collectionFiles, dataSource)

        const results = await dataSource.getRepository(Collection).delete({ name: name, user: user })

        return results
    }

    async getCollections(user: User) {
        const files = await this.client.files.list()

        const collections: string[] = []
        for (const f of Array.from(files.data)) {
            if (f.filename.includes(String(user.id))) {
                const name = f.filename.split('_')[0]
                // Check if the name already exists in the collections array
                if (!collections.includes(name)) {
                    collections.push(name)
                }
            }
        }
        return collections
    }

    async getSpecificCollection(user: User, collection_name: string) {
        return { collection_name: collection_name }
    }

    async getFiles(user: User, name: string) {
        const files = await this.client.files.list()

        const collectionFiles = []
        for (const f of Array.from(files.data)) {
            if (f.filename.includes(name) && f.filename.includes(String(user.id))) {
                const name = f.filename.split('_').pop()
                collectionFiles.push({ fileName: name, langchain_primaryid: f.id })
            }
        }

        return { data: collectionFiles }
    }

    async addFiles(user: User, collection: string, fileData: any, dataSource: DataSource) {
        // the collection name and user id are added to the file name

        const fileAdditionPromise = fileData.map(async (file: any) => {
            const splitDataURI = file.split(',')
            const fileName = getFileName(file)
            const updatedName = `${collection}_${String(user.id)}_${fileName}`

            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const cf = new File([bf], updatedName)
            const upload = this.client.files.create({
                file: cf,
                purpose: 'assistants'
            })

            return upload
        })

        const results = await Promise.all(fileAdditionPromise)

        return results
    }

    async deleteFiles(user: User, collection: string, fileIds: string[], dataSource: DataSource) {
        const deletePromise = fileIds.map(async (id: string) => {
            const del = this.client.files.del(id)

            return del
        })

        const results = await Promise.all(deletePromise)

        await this.updateCollection(user, collection, dataSource)

        return results
    }
}
