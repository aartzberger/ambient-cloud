import express, { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy } from 'passport-google-oauth20'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import http from 'http'
import * as fs from 'fs'
import basicAuth from 'express-basic-auth'
import { Server } from 'socket.io'
import logger from './utils/logger'
import { expressRequestLogger } from './utils/logger'
import { MilvusClient } from '@zilliz/milvus2-sdk-node'

import {
    IChatFlow,
    IncomingInput,
    IReactFlowNode,
    IReactFlowObject,
    INodeData,
    IDatabaseExport,
    ICredentialReturnResponse
} from './Interface'
import {
    getNodeModulesPackagePath,
    getStartingNodes,
    buildLangchain,
    getEndingNode,
    constructGraphs,
    resolveVariables,
    isStartNodeDependOnInput,
    getAPIKeys,
    addAPIKey,
    updateAPIKey,
    deleteAPIKey,
    compareKeys,
    mapMimeTypeToInputField,
    findAvailableConfigs,
    isSameOverrideConfig,
    replaceAllAPIKeys,
    isFlowValidForStream,
    databaseEntities,
    getApiKey,
    transformToCredentialEntity,
    decryptCredentialData,
    clearSessionMemory,
    replaceInputsWithConfig,
    getEncryptionKey,
    checkMemorySessionId
} from './utils'
import MilvusUpsert from './utils/Upsert'
import blacklistNodes from './utils/blacklist'
import { DocumentLoaders, getFileName } from './utils/DocsLoader'
import JsRunner from './utils/js_runner.js'
import { cloneDeep, omit } from 'lodash'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { User } from './database/entities/User'
import { ChatFlow } from './database/entities/ChatFlow'
import { Automation } from './database/entities/Automation'
import { Trigger } from './database/entities/Trigger'
import { AutomationHandler } from './database/entities/AutomationHandler'
import { ChatMessage } from './database/entities/ChatMessage'
import { Credential } from './database/entities/Credential'
import { Tool } from './database/entities/Tool'
import { RemoteDb } from './database/entities/RemoteDb'
import { ChatflowPool } from './ChatflowPool'
import { CachePool } from './CachePool'
import { ICommonObject, INodeOptionsValue } from 'flowise-components'
import { createRateLimiter, getRateLimiter, initializeRateLimiter } from './utils/rateLimit'

import { RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import PredictionHandler from './PredictionHandler'
// import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'

// TODO CMAN - chang this for input
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// used for testing and development - dev user login creds are used
const DEV_MODE = process.env.NODE_ENV === 'dev'
// TODO CMAN - in future add dev mode to ambient-local
const DEV_MILVUS_PORT = process.env.DEV_MILVUS_PORT

export class App {
    app: express.Application
    nodesPool: NodesPool
    chatflowPool: ChatflowPool
    cachePool: CachePool
    AppDataSource = getDataSource()

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        this.AppDataSource.initialize()
            .then(async () => {
                logger.info('📦 [server]: Data Source has been initialized!')

                // Run Migrations Scripts
                await this.AppDataSource.runMigrations({ transaction: 'each' })

                // Initialize nodes pool
                this.nodesPool = new NodesPool()
                await this.nodesPool.initialize()

                // Initialize chatflow pool
                this.chatflowPool = new ChatflowPool()

                // Initialize API keys
                await getAPIKeys()

                // Initialize encryption key
                await getEncryptionKey()

                // Initialize Rate Limit
                const AllChatFlow: IChatFlow[] = await getAllChatFlow()
                await initializeRateLimiter(AllChatFlow)

                // Initialize cache pool
                this.cachePool = new CachePool()
            })
            .catch((err) => {
                logger.error('❌ [server]: Error during Data Source initialization:', err)
            })
    }

    async config(socketIO?: Server) {
        // Limit is needed to allow sending/receiving base64 encoded string
        this.app.use(express.json({ limit: '50mb' }))
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }))

        if (process.env.NUMBER_OF_PROXIES && parseInt(process.env.NUMBER_OF_PROXIES) > 0)
            this.app.set('trust proxy', parseInt(process.env.NUMBER_OF_PROXIES))

        // Allow access from *
        this.app.use(cors())

        // Add the expressRequestLogger middleware to log all requests
        this.app.use(expressRequestLogger)

        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            const username = process.env.FLOWISE_USERNAME
            const password = process.env.FLOWISE_PASSWORD
            const basicAuthMiddleware = basicAuth({
                users: { [username]: password }
            })
            const whitelistURLs = [
                '/api/v1/verify/apikey/',
                '/api/v1/chatflows/apikey/',
                '/api/v1/public-chatflows',
                '/api/v1/prediction/',
                '/api/v1/node-icon/',
                '/api/v1/components-credentials-icon/',
                '/api/v1/chatflows-streaming',
                '/api/v1/ip'
            ]
            this.app.use((req, res, next) => {
                if (req.url.includes('/api/v1/')) {
                    whitelistURLs.some((url) => req.url.includes(url)) ? next() : basicAuthMiddleware(req, res, next)
                } else next()
            })
        }

        const upload = multer({ dest: `${path.join(__dirname, '..', 'uploads')}/` })

        this.app.use(
            session({
                secret: 'secret-key',
                resave: false,
                saveUninitialized: true
            })
        )

        this.app.use(passport.initialize())
        this.app.use(passport.session())

        // Apply the authentication middleware.
        function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
            if (req.isAuthenticated()) {
                return next()
            }

            res.redirect('/')
        }

        passport.serializeUser((user: any, done) => {
            done(null, user.id)
        })

        passport.deserializeUser(async (id: string, done) => {
            const user = await this.AppDataSource.getRepository(User).findOneBy({
                id: id
            })
            done(null, user)
        })

        const DEPLOYED_URL = process.env.DEPLOYED_URL

        // function for loging in a user or creating a new one
        const loginOrCreateUser = async (profile: any) => {
            const existingUser = await this.AppDataSource.getRepository(User).findOneBy({
                id: profile.id
            })

            if (existingUser) {
                // Existing user, use this user
                return existingUser
            }
            // New user, create a new user and then use that user
            const newUser = await this.AppDataSource.getRepository(User).save({
                id: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value
            })

            return newUser
        }

        passport.use(
            new Strategy(
                {
                    clientID: '530294522870-o17j0nite5q2tcslg0tsn1li9bh4rtv3.apps.googleusercontent.com',
                    clientSecret: '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',
                    callbackURL: `https://${DEPLOYED_URL}/api/v1/auth/google/callback`
                },
                async (accessToken: any, refreshToken: any, profile: any, done: any) => {
                    // Check if user exists in the database
                    const user = await loginOrCreateUser(profile)

                    return done(null, user)
                }
            )
        )

        // ----------------------------------------
        // Login
        // ----------------------------------------
        this.app.get('/auth/google', (req, res, next) => {
            if (DEV_MODE) {
                // Redirect directly to the callback with default user values if in dev mode
                if (!DEV_MILVUS_PORT) {
                    throw new Error('DEV_MILVUS_PORT must be set in server .env for DEV_MODE to work')
                }

                return res.redirect('/api/v1/auth/google/callback')
            }
            passport.authenticate('google', {
                scope: ['profile', 'email'],
                prompt: 'select_account'
            })(req, res, next)
        })

        this.app.get(
            '/api/v1/auth/google/callback',
            async (req, res, next) => {
                if (DEV_MODE) {
                    // Simulate a successful authentication with default user values
                    const defaultUser = {
                        id: '123456789',
                        displayName: 'Dev User',
                        emails: [{ value: 'devuser@example.com' }]
                    }
                    const user = await loginOrCreateUser(defaultUser)
                    // Manually log the user in
                    req.logIn(user, async (err) => {
                        if (err) {
                            return next(err)
                        }

                        // Directly call to add the milvus and client url to the database (these are from ENV)
                        try {
                            const result = await handleRemoteDb({
                                id: user.id,
                                milvusUrl: `http://server.ambientware.co:${DEV_MILVUS_PORT}`,
                                clientUrl: 'foobar'
                            })
                        } catch (error) {
                            console.error('Error in handleRemoteDb:', error)
                        }

                        return res.redirect('/chatflows')
                    })
                    // Prevent further execution
                    return
                }
                passport.authenticate('google', { failureRedirect: '/' })(req, res, next)
            },
            (req, res) => {
                // If in DEV_MODE, this middleware should not be reached.
                if (!DEV_MODE) {
                    // Successful authentication, redirect home.
                    res.redirect('/chatflows')
                }
            }
        )

        // ----------------------------------------
        // Configure number of proxies in Host Environment
        // ----------------------------------------
        this.app.get('/api/v1/ip', (request, response) => {
            response.send({
                ip: request.ip,
                msg: 'See the returned IP address in the response. If it matches your current IP address ( which you can get by going to http://ip.nfriedly.com/ or https://api.ipify.org/ ), then the number of proxies is correct and the rate limiter should now work correctly. If not, increase the number of proxies by 1 until the IP address matches your own. Visit https://docs.flowiseai.com/deployment#rate-limit-setup-guide for more information.'
            })
        })

        // ----------------------------------------
        // Components
        // ----------------------------------------

        // Get all component nodes
        this.app.get('/api/v1/nodes', (req: Request, res: Response) => {
            const returnData = []
            for (const nodeName in this.nodesPool.componentNodes) {
                if (blacklistNodes.includes(nodeName)) continue // skip over nodes that are blacklisted
                const clonedNode = cloneDeep(this.nodesPool.componentNodes[nodeName])
                returnData.push(clonedNode)
            }
            return res.json(returnData)
        })

        // Get all component credentials
        this.app.get('/api/v1/components-credentials', async (req: Request, res: Response) => {
            const returnData = []
            for (const credName in this.nodesPool.componentCredentials) {
                const clonedCred = cloneDeep(this.nodesPool.componentCredentials[credName])
                returnData.push(clonedCred)
            }
            return res.json(returnData)
        })

        // Get specific component node via name
        this.app.get('/api/v1/nodes/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                return res.json(this.nodesPool.componentNodes[req.params.name])
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // Get component credential via name
        this.app.get('/api/v1/components-credentials/:name', (req: Request, res: Response) => {
            if (!req.params.name.includes('&')) {
                if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentCredentials, req.params.name)) {
                    return res.json(this.nodesPool.componentCredentials[req.params.name])
                } else {
                    throw new Error(`Credential ${req.params.name} not found`)
                }
            } else {
                const returnResponse = []
                for (const name of req.params.name.split('&')) {
                    if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentCredentials, name)) {
                        returnResponse.push(this.nodesPool.componentCredentials[name])
                    } else {
                        throw new Error(`Credential ${name} not found`)
                    }
                }
                return res.json(returnResponse)
            }
        })

        // Returns specific component node icon via name
        this.app.get('/api/v1/node-icon/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                const nodeInstance = this.nodesPool.componentNodes[req.params.name]
                if (nodeInstance.icon === undefined) {
                    throw new Error(`Node ${req.params.name} icon not found`)
                }

                if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                    const filepath = nodeInstance.icon
                    res.sendFile(filepath)
                } else {
                    throw new Error(`Node ${req.params.name} icon is missing icon`)
                }
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // Returns specific component credential icon via name
        this.app.get('/api/v1/components-credentials-icon/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentCredentials, req.params.name)) {
                const credInstance = this.nodesPool.componentCredentials[req.params.name]
                if (credInstance.icon === undefined) {
                    throw new Error(`Credential ${req.params.name} icon not found`)
                }

                if (credInstance.icon.endsWith('.svg') || credInstance.icon.endsWith('.png') || credInstance.icon.endsWith('.jpg')) {
                    const filepath = credInstance.icon
                    res.sendFile(filepath)
                } else {
                    throw new Error(`Credential ${req.params.name} icon is missing icon`)
                }
            } else {
                throw new Error(`Credential ${req.params.name} not found`)
            }
        })

        // load async options
        this.app.post('/api/v1/node-load-method/:name', async (req: Request, res: Response) => {
            const nodeData: INodeData = req.body
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                try {
                    const nodeInstance = this.nodesPool.componentNodes[req.params.name]
                    const methodName = nodeData.loadMethod || ''

                    const returnOptions: INodeOptionsValue[] = await nodeInstance.loadMethods![methodName]!.call(nodeInstance, nodeData, {
                        appDataSource: this.AppDataSource,
                        databaseEntities: databaseEntities,
                        req: req
                    })

                    return res.json(returnOptions)
                } catch (error) {
                    return res.json([])
                }
            } else {
                res.status(404).send(`Node ${req.params.name} not found`)
                return
            }
        })

        // ----------------------------------------
        // Chatflows
        // ----------------------------------------

        // Get all chatflows
        this.app.get('/api/v1/chatflows', ensureAuthenticated, async (req: Request, res: Response) => {
            const chatflows: IChatFlow[] = await this.AppDataSource.getRepository(ChatFlow).find({
                where: { user: req.user as User }
            })
            return res.json(chatflows)
        })

        // Get specific chatflow via api key
        this.app.get('/api/v1/chatflows/apikey/:apiKey', async (req: Request, res: Response) => {
            try {
                const apiKey = await getApiKey(req.params.apiKey)
                if (!apiKey) return res.status(401).send('Unauthorized')
                const chatflows = await this.AppDataSource.getRepository(ChatFlow)
                    .createQueryBuilder('cf')
                    .where('cf.apikeyid = :apikeyid', { apikeyid: apiKey.id })
                    .orWhere('cf.apikeyid IS NULL')
                    .orWhere('cf.apikeyid = ""')
                    .orderBy('cf.name', 'ASC')
                    .getMany()
                if (chatflows.length >= 1) return res.status(200).send(chatflows)
                return res.status(404).send('Chatflow not found')
            } catch (err: any) {
                return res.status(500).send(err?.message)
            }
        })

        // Get specific chatflow via id
        this.app.get('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (chatflow) return res.json(chatflow)
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        })

        // Get specific chatflow via id (PUBLIC endpoint, used when sharing chatbot link)
        this.app.get('/api/v1/public-chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (chatflow && chatflow.isPublic) return res.json(chatflow)
            else if (chatflow && !chatflow.isPublic) return res.status(401).send(`Unauthorized`)
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        })

        // Save chatflow
        this.app.post('/api/v1/chatflows', async (req: Request, res: Response) => {
            const body = req.body
            const newChatFlow = new ChatFlow()
            Object.assign(newChatFlow, body)
            newChatFlow.user = req.user as User

            const chatflow = this.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const results = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            return res.json(results)
        })

        // Update chatflow
        this.app.put('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })

            if (!chatflow) {
                res.status(404).send(`Chatflow ${req.params.id} not found`)
                return
            }

            const body = req.body
            const updateChatFlow = new ChatFlow()
            Object.assign(updateChatFlow, body)

            updateChatFlow.id = chatflow.id
            createRateLimiter(updateChatFlow)

            this.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
            const result = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // Update chatflowpool inSync to false, to build Langchain again because data has been changed
            this.chatflowPool.updateInSync(chatflow.id, false)

            return res.json(result)
        })

        // Delete chatflow via id
        this.app.delete('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(ChatFlow).delete({ id: req.params.id })
            return res.json(results)
        })

        // Check if chatflow valid for streaming
        this.app.get('/api/v1/chatflows-streaming/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)

            /*** Get Ending Node with Directed Graph  ***/
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges
            const { graph, nodeDependencies } = constructGraphs(nodes, edges)

            const endingNodeId = getEndingNode(nodeDependencies, graph)
            if (!endingNodeId) return res.status(500).send(`Ending node ${endingNodeId} not found`)

            const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
            if (!endingNodeData) return res.status(500).send(`Ending node ${endingNodeId} data not found`)

            if (endingNodeData && endingNodeData.category !== 'Chains' && endingNodeData.category !== 'Agents') {
                return res.status(500).send(`Ending node must be either a Chain or Agent`)
            }

            const obj = {
                isStreaming: isFlowValidForStream(nodes, endingNodeData)
            }
            return res.json(obj)
        })

        // ----------------------------------------
        // ChatMessage
        // ----------------------------------------

        // Get all chatmessages from chatflowid
        this.app.get('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const chatmessages = await this.AppDataSource.getRepository(ChatMessage).find({
                where: {
                    chatflowid: req.params.id
                },
                order: {
                    createdDate: 'ASC'
                }
            })
            return res.json(chatmessages)
        })

        // Add chatmessages for chatflowid
        this.app.post('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const body = req.body
            const newChatMessage = new ChatMessage()
            Object.assign(newChatMessage, body)
            newChatMessage.user = req.user as User

            const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
            const results = await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)

            return res.json(results)
        })

        // Delete all chatmessages from chatflowid
        this.app.delete('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) {
                res.status(404).send(`Chatflow ${req.params.id} not found`)
                return
            }
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            let chatId = await getChatId(chatflow.id)
            if (!chatId) chatId = chatflow.id
            clearSessionMemory(nodes, this.nodesPool.componentNodes, chatId, this.AppDataSource, req.query.sessionId as string)
            const results = await this.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // Credentials
        // ----------------------------------------

        // Create new credential
        this.app.post('/api/v1/credentials', ensureAuthenticated, async (req: Request, res: Response) => {
            const body = req.body
            const newCredential = await transformToCredentialEntity(body)
            newCredential.user = req.user as User

            const credential = this.AppDataSource.getRepository(Credential).create(newCredential)
            const results = await this.AppDataSource.getRepository(Credential).save(credential)
            return res.json(results)
        })

        // Get all credentials
        this.app.get('/api/v1/credentials', async (req: Request, res: Response) => {
            if (req.query.credentialName) {
                let returnCredentials = []
                if (Array.isArray(req.query.credentialName)) {
                    for (let i = 0; i < req.query.credentialName.length; i += 1) {
                        const name = req.query.credentialName[i] as string
                        const credentials = await this.AppDataSource.getRepository(Credential).findBy({
                            credentialName: name,
                            user: req.user as User
                        })
                        returnCredentials.push(...credentials)
                    }
                } else {
                    const credentials = await this.AppDataSource.getRepository(Credential).findBy({
                        credentialName: req.query.credentialName as string,
                        user: req.user as User
                    })
                    returnCredentials = [...credentials]
                }
                return res.json(returnCredentials)
            } else {
                const credentials = await this.AppDataSource.getRepository(Credential).findBy({
                    user: req.user as User
                })
                const returnCredentials = []
                for (const credential of credentials) {
                    returnCredentials.push(omit(credential, ['encryptedData']))
                }
                return res.json(returnCredentials)
            }
        })

        // Get specific credential
        this.app.get('/api/v1/credentials/:id', async (req: Request, res: Response) => {
            const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                id: req.params.id
            })

            if (!credential) return res.status(404).send(`Credential ${req.params.id} not found`)

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(
                credential.encryptedData,
                credential.credentialName,
                this.nodesPool.componentCredentials
            )
            const returnCredential: ICredentialReturnResponse = {
                ...credential,
                plainDataObj: decryptedCredentialData
            }
            return res.json(omit(returnCredential, ['encryptedData']))
        })

        // Update credential
        this.app.put('/api/v1/credentials/:id', async (req: Request, res: Response) => {
            const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                id: req.params.id
            })

            if (!credential) return res.status(404).send(`Credential ${req.params.id} not found`)

            const body = req.body
            const updateCredential = await transformToCredentialEntity(body)
            this.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
            const result = await this.AppDataSource.getRepository(Credential).save(credential)

            return res.json(result)
        })

        // Delete all chatmessages from chatflowid
        this.app.delete('/api/v1/credentials/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(Credential).delete({ id: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // Automations
        // ----------------------------------------

        // process for making automation prediction
        this.app.post(
            '/api/v1/automations/run/:id',
            upload.array('files'),
            (req: Request, res: Response, next: NextFunction) => getRateLimiter(req, res, next),
            async (req: Request, res: Response) => {
                await this.processAutomation(req, res)
            }
        )

        // Get all automations
        this.app.get('/api/v1/automations', ensureAuthenticated, async (req: Request, res: Response) => {
            const automations = await this.AppDataSource.getRepository(Automation).find({
                where: { user: req.user }
            })
            return res.json(automations)
        })

        // Get specific automation
        this.app.get('/api/v1/automations/:id', async (req: Request, res: Response) => {
            const automatin = await this.AppDataSource.getRepository(Automation).findOneBy({
                id: req.params.id
            })
            return res.json(automatin)
        })

        // // Add automation
        // this.app.post('/api/v1/automations', async (req: Request, res: Response) => {
        //     const body = req.body
        //     const automationList = body.automations

        //     try {
        //         for (let auto of automationList) {
        //             // create the automation trigger
        //             const newAutomation = new Automation()
        //             Object.assign(newAutomation, auto)
        //             newAutomation.user = req.user as User
        //             const automation = this.AppDataSource.getRepository(Automation).create(newAutomation)
        //             const results = await this.AppDataSource.getRepository(Automation).save(automation)
        //             if (!results) return res.status(500).send(`Error when creating automation`)
        //         }

        //         return res.json('success')
        //     } catch (err) {
        //         return res.status(500).send(`Error when creating automation`)
        //     }
        // })

        // Update or add automation
        this.app.post('/api/v1/automations/:chatflowid', async (req: Request, res: Response) => {
            // get the chatflowid from the url
            const chatflowid = req.params.chatflowid

            const automationList = req.body.automations

            // keep track of urls (unique identifiers for automation) so we can use it to remove automations that are not in the list
            let flowUrls = []

            if (automationList.length !== 0) {
                for (const auto of automationList) {
                    const url = auto.url
                    flowUrls.push(url)

                    const automation = await this.AppDataSource.getRepository(Automation).findOneBy({
                        chatflowid: chatflowid,
                        url: url
                    })

                    if (!automation) {
                        // no automation so we have to make a new one
                        const newAutomation = new Automation()
                        Object.assign(newAutomation, auto)
                        newAutomation.user = req.user as User
                        const automation = this.AppDataSource.getRepository(Automation).create(newAutomation)
                        const results = await this.AppDataSource.getRepository(Automation).save(automation)
                        if (!results) return res.status(500).send(`Error when creating automation`)
                    } else {
                        // automation exists so we update it
                        const updatedAutomation = new Automation()
                        Object.assign(updatedAutomation, auto)
                        updatedAutomation.user = req.user as User

                        // update the automation
                        this.AppDataSource.getRepository(Automation).merge(automation, updatedAutomation)
                        const results = await this.AppDataSource.getRepository(Automation).save(automation)
                        if (!results) return res.status(500).send(`Error when updating automation`)
                    }
                }
            }

            // finally, check all the automatins for a given chatflowid and delete the ones that are not in the automationList
            const flowAutomations = await this.AppDataSource.getRepository(Automation).findBy({
                chatflowid: chatflowid
            })

            for (const auto of flowAutomations) {
                if (!flowUrls.includes(auto.url)) {
                    // this automation is not in the automationList so we delete it
                    await this.AppDataSource.getRepository(Automation).delete({ id: auto.id })
                }
            }

            return res.json('success')
        })

        // Delete Automation
        this.app.delete('/api/v1/automations/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(Automation).delete({ id: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // Triggers
        // ----------------------------------------

        // Get all triggers
        this.app.get('/api/v1/triggers', ensureAuthenticated, async (req: Request, res: Response) => {
            const triggers = await this.AppDataSource.getRepository(Trigger).find({
                where: { user: req.user }
            })
            return res.json(triggers)
        })

        // Get specific trigger
        this.app.get('/api/v1/triggers/:id', async (req: Request, res: Response) => {
            const trigger = await this.AppDataSource.getRepository(Trigger).findOneBy({
                id: req.params.id
            })
            return res.json(trigger)
        })

        // Add trigger
        this.app.post('/api/v1/triggers', async (req: Request, res: Response) => {
            const body = req.body
            // create the automation trigger
            const newTrigger = new Trigger()
            Object.assign(newTrigger, body)
            newTrigger.user = req.user as User

            const trigger = this.AppDataSource.getRepository(Trigger).create(newTrigger)
            const results = await this.AppDataSource.getRepository(Trigger).save(trigger)

            return res.json(results)
        })

        // Update trigger
        this.app.put('/api/v1/triggers/:id', async (req: Request, res: Response) => {
            const trigger = await this.AppDataSource.getRepository(Trigger).findOneBy({
                id: req.params.id
            })

            if (!trigger) {
                res.status(404).send(`Automation ${req.params.id} not found`)
                return
            }

            const updatedTrigger = new Trigger()
            Object.assign(updatedTrigger, req.body)
            updatedTrigger.user = req.user as User

            // update the automation
            this.AppDataSource.getRepository(Trigger).merge(trigger, updatedTrigger)
            const result = await this.AppDataSource.getRepository(Trigger).save(trigger)

            return res.json(result)
        })

        // Delete trigger
        this.app.delete('/api/v1/triggers/:id', async (req: Request, res: Response) => {
            const result = await this.AppDataSource.getRepository(Trigger).delete({ id: req.params.id })
            return res.json(result)
        })

        // ----------------------------------------
        // AutomationHandlers
        // ----------------------------------------

        // Get all handlers
        this.app.get('/api/v1/automation-handlers', ensureAuthenticated, async (req: Request, res: Response) => {
            const handlers = await this.AppDataSource.getRepository(AutomationHandler).find({
                where: { user: req.user }
            })
            return res.json(handlers)
        })

        // Get specific handler
        this.app.get('/api/v1/automation-handlers/:id', async (req: Request, res: Response) => {
            const handler = await this.AppDataSource.getRepository(AutomationHandler).findOneBy({
                id: req.params.id
            })
            return res.json(handler)
        })

        // Add handler
        this.app.post('/api/v1/automation-handlers', async (req: Request, res: Response) => {
            const body = req.body
            // create the automation trigger
            const newHandler = new AutomationHandler()
            Object.assign(newHandler, body)
            newHandler.user = req.user as User

            const handler = this.AppDataSource.getRepository(AutomationHandler).create(newHandler)
            const results = await this.AppDataSource.getRepository(AutomationHandler).save(handler)

            return res.json(results)
        })

        // Update handler
        this.app.put('/api/v1/automation-handlers/:id', async (req: Request, res: Response) => {
            const handler = await this.AppDataSource.getRepository(AutomationHandler).findOneBy({
                id: req.params.id
            })

            if (!handler) {
                res.status(404).send(`Automation ${req.params.id} not found`)
                return
            }

            const updatedHandler = new AutomationHandler()
            Object.assign(updatedHandler, req.body)
            updatedHandler.user = req.user as User

            // update the handler
            this.AppDataSource.getRepository(AutomationHandler).merge(handler, updatedHandler)
            const result = await this.AppDataSource.getRepository(AutomationHandler).save(handler)

            return res.json(result)
        })

        // Delete handler
        this.app.delete('/api/v1/automation-handlers/:id', async (req: Request, res: Response) => {
            const result = await this.AppDataSource.getRepository(AutomationHandler).delete({ id: req.params.id })
            return res.json(result)
        })

        // ----------------------------------------
        // Tools
        // ----------------------------------------

        // Get all tools
        this.app.get('/api/v1/tools', ensureAuthenticated, async (req: Request, res: Response) => {
            const tools = await this.AppDataSource.getRepository(Tool).find({
                where: { user: req.user }
            })
            return res.json(tools)
        })

        // Get specific tool
        this.app.get('/api/v1/tools/:id', async (req: Request, res: Response) => {
            const tool = await this.AppDataSource.getRepository(Tool).findOneBy({
                id: req.params.id
            })
            return res.json(tool)
        })

        // Add tool
        this.app.post('/api/v1/tools', async (req: Request, res: Response) => {
            const body = req.body
            const newTool = new Tool()
            Object.assign(newTool, body)
            newTool.user = req.user as User

            const tool = this.AppDataSource.getRepository(Tool).create(newTool)
            const results = await this.AppDataSource.getRepository(Tool).save(tool)

            return res.json(results)
        })

        // Update tool
        this.app.put('/api/v1/tools/:id', async (req: Request, res: Response) => {
            const tool = await this.AppDataSource.getRepository(Tool).findOneBy({
                id: req.params.id
            })

            if (!tool) {
                res.status(404).send(`Tool ${req.params.id} not found`)
                return
            }

            const body = req.body
            const updateTool = new Tool()
            Object.assign(updateTool, body)

            this.AppDataSource.getRepository(Tool).merge(tool, updateTool)
            const result = await this.AppDataSource.getRepository(Tool).save(tool)

            return res.json(result)
        })

        // Delete tool
        this.app.delete('/api/v1/tools/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(Tool).delete({ id: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // RemoteDb
        // ----------------------------------------

        // handle create or update remotedb
        const handleRemoteDb = async (reqBody: any) => {
            const user = await this.AppDataSource.getRepository(User).findOneBy({
                id: reqBody.id
            })

            if (!user) {
                throw new Error(`User ${reqBody.id} not found`)
            }

            const currentdb = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: user
            })

            const endpointData = { milvusUrl: reqBody.milvusUrl, clientUrl: reqBody.clientUrl }

            if (currentdb) {
                const updateRemoteDb = new RemoteDb()
                Object.assign(updateRemoteDb, endpointData)

                this.AppDataSource.getRepository(RemoteDb).merge(currentdb, updateRemoteDb)
                return await this.AppDataSource.getRepository(RemoteDb).save(currentdb)
            } else if (!currentdb && user) {
                const newRemoteDb = new RemoteDb()
                Object.assign(newRemoteDb, endpointData)
                newRemoteDb.user = user

                const remotedb = this.AppDataSource.getRepository(RemoteDb).create(newRemoteDb)
                return await this.AppDataSource.getRepository(RemoteDb).save(remotedb)
            }
        }

        // create or update remotedb
        this.app.post('/api/v1/remotedb', async (req: Request, res: Response) => {
            const body = req.body

            const result = await handleRemoteDb(body)

            return res.json(result)
        })

        // return the remote client endpoint for a given user
        this.app.get('/api/v1/user-client-endpoint', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const endpointData = { endpoint: remoteData ? (remoteData as RemoteDb).clientUrl : '' }
            return res.json(endpointData)
        })

        // return the remote milvus endpoint for a given user
        this.app.get('/api/v1/user-milvus-endpoint', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const endpointData = { endpoint: remoteData ? (remoteData as RemoteDb).milvusUrl : '' }
            return res.json(endpointData)
        })

        // return a specific collection
        this.app.get('/api/v1/milvus-collections/:name', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const collection = await client.describeCollection({
                // Return the name and schema of the collection.
                collection_name: req.params.name
            })

            return res.json(collection)
        })

        // load or unload a specific collection
        this.app.post('/api/v1/load-unload-collection', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const load = req.body.load
            const name = req.body.collection

            let status
            if (load) {
                status = await client.loadCollection({
                    // Return the name and schema of the collection.
                    collection_name: name
                })
            } else {
                status = await client.releaseCollection({
                    // Return the name and schema of the collection.
                    collection_name: name
                })
            }

            return res.json(status)
        })

        // query collection name to get docs info
        this.app.get('/api/v1/milvus-query/:name', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const queryResult = await client.query({
                // Return the name and schema of the collection.
                collection_name: req.params.name,
                expr: '',
                output_fields: ['fileName'],
                limit: 15000
            })

            return res.json(queryResult)
        })

        // return a list of collections belonging to a given user
        this.app.get('/api/v1/milvus-collections', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const collections = await client.showCollections()

            const returnData: INodeOptionsValue[] = []
            for (let collection of collections.data) {
                const data = {
                    name: collection.name
                } as INodeOptionsValue
                returnData.push(data)
            }

            return res.json(returnData)
        })

        // delete collection entities
        this.app.post('/api/v1/milvus-delete-entities/', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const result = await client.deleteEntities({
                // Return the name and schema of the collection.
                collection_name: req.body.collection_name,
                expr: req.body.expr
            })

            return res.json(result)
        })

        // remove a collection from a given user
        this.app.get('/api/v1/delete-collection/:name', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const collection = await client.dropCollection({
                // Return the name and schema of the collection.
                collection_name: req.params.name
            })

            return res.json(collection)
        })

        // update a collection from a given user
        this.app.post('/api/v1/rename-collection', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const client = remoteData ? new MilvusClient({ address: remoteData.milvusUrl as string }) : null
            if (!client) return res.status(400).send('Milvus client not found')

            const collection = await client.renameCollection({
                // Return the name and schema of the collection.
                collection_name: req.body.oldName,
                new_collection_name: req.body.newName
            })

            return res.json(collection)
        })

        // create a collection from a given user
        this.app.post('/api/v1/create-collection/:collectionName', async (req: Request, res: Response) => {
            const remoteData = await this.AppDataSource.getRepository(RemoteDb).findOneBy({
                user: req.user as User
            })

            const obj = {} as RecursiveCharacterTextSplitterParams
            obj.chunkSize = 1500
            obj.chunkOverlap = 200

            const textSplitter = new RecursiveCharacterTextSplitter(obj)

            const fileBase64 = req.body.files
            const collectionName = req.params.collectionName

            let alldocs = []
            let files: string[] = []

            if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                files = JSON.parse(fileBase64)
            } else {
                files = [fileBase64]
            }

            for (const file of files) {
                const splitDataURI = file.split(',')
                const fileName = getFileName(file)
                const fileExtension = fileName.split('.').pop()

                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

                const documentLoader = DocumentLoaders.get(fileExtension) as any

                const loader = new documentLoader(new Blob([bf]))

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    for (const doc of docs) {
                        doc.metadata = { fileName: fileName }
                    }
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    for (const doc of docs) {
                        doc.metadata = { fileName: fileName }
                    }
                    alldocs.push(...docs)
                    // }
                }
            }

            // TODO CMAN - make this dynamic
            const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
            // const embeddings = new HuggingFaceInferenceEmbeddings({model: 'sentence-transformers/all-MiniLM-L6-v2'}) // api key passed by env variable

            const milvusArgs = {
                collectionName: collectionName,
                url: remoteData ? (remoteData.milvusUrl as string) : ''
            }

            const vectorStore = await MilvusUpsert.fromDocuments(alldocs, embeddings, milvusArgs)

            // TODO CMAN - need to return something relevant
            return res.json('ok')
        })

        // ----------------------------------------
        // Configuration
        // ----------------------------------------

        this.app.get('/api/v1/flow-config/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const availableConfigs = findAvailableConfigs(nodes, this.nodesPool.componentCredentials)
            return res.json(availableConfigs)
        })

        this.app.post('/api/v1/node-config', async (req: Request, res: Response) => {
            const nodes = [{ data: req.body }] as IReactFlowNode[]
            const availableConfigs = findAvailableConfigs(nodes, this.nodesPool.componentCredentials)
            return res.json(availableConfigs)
        })

        this.app.get('/api/v1/version', async (req: Request, res: Response) => {
            const getPackageJsonPath = (): string => {
                const checkPaths = [
                    path.join(__dirname, '..', 'package.json'),
                    path.join(__dirname, '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', '..', 'package.json'),
                    path.join(__dirname, '..', '..', '..', '..', '..', 'package.json')
                ]
                for (const checkPath of checkPaths) {
                    if (fs.existsSync(checkPath)) {
                        return checkPath
                    }
                }
                return ''
            }

            const packagejsonPath = getPackageJsonPath()
            if (!packagejsonPath) return res.status(404).send('Version not found')
            try {
                const content = await fs.promises.readFile(packagejsonPath, 'utf8')
                const parsedContent = JSON.parse(content)
                return res.json({ version: parsedContent.version })
            } catch (error) {
                return res.status(500).send(`Version not found: ${error}`)
            }
        })

        // ----------------------------------------
        // Export Load Chatflow & ChatMessage & Apikeys
        // ----------------------------------------

        this.app.get('/api/v1/database/export', async (req: Request, res: Response) => {
            const chatmessages = await this.AppDataSource.getRepository(ChatMessage).find({
                where: { user: req.user as User }
            })
            const chatflows = await this.AppDataSource.getRepository(ChatFlow).find({
                where: { user: req.user as User }
            })
            const apikeys = await getAPIKeys()
            const result: IDatabaseExport = {
                chatmessages,
                chatflows,
                apikeys
            }
            return res.json(result)
        })

        this.app.post('/api/v1/database/load', async (req: Request, res: Response) => {
            const databaseItems: IDatabaseExport = req.body

            await this.AppDataSource.getRepository(ChatFlow).delete({})
            await this.AppDataSource.getRepository(ChatMessage).delete({})

            let error = ''

            // Get a new query runner instance
            const queryRunner = this.AppDataSource.createQueryRunner()

            // Start a new transaction
            await queryRunner.startTransaction()

            try {
                const chatflows: ChatFlow[] = databaseItems.chatflows
                const chatmessages: ChatMessage[] = databaseItems.chatmessages

                await queryRunner.manager.insert(ChatFlow, chatflows)
                await queryRunner.manager.insert(ChatMessage, chatmessages)

                await queryRunner.commitTransaction()
            } catch (err: any) {
                error = err?.message ?? 'Error loading database'
                await queryRunner.rollbackTransaction()
            } finally {
                await queryRunner.release()
            }

            await replaceAllAPIKeys(databaseItems.apikeys)

            if (error) return res.status(500).send(error)
            return res.status(201).send('OK')
        })

        // ----------------------------------------
        // Prediction
        // ----------------------------------------

        // Send input message and get prediction result (External)
        this.app.post(
            '/api/v1/prediction/:id',
            upload.array('files'),
            (req: Request, res: Response, next: NextFunction) => getRateLimiter(req, res, next),
            async (req: Request, res: Response) => {
                await this.processPrediction(req, res, socketIO)
            }
        )

        // Send input message and get prediction result (Internal)
        this.app.post('/api/v1/internal-prediction/:id', async (req: Request, res: Response) => {
            await this.processPrediction(req, res, socketIO, true)
        })

        // ----------------------------------------
        // Marketplaces
        // ----------------------------------------

        // Get all chatflows for marketplaces
        this.app.get('/api/v1/marketplaces/chatflows', ensureAuthenticated, async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'chatflows')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'chatflows', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    id: index,
                    name: file.split('.json')[0],
                    flowData: fileData.toString(),
                    description: fileDataObj?.description || ''
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // Get all tools for marketplaces
        this.app.get('/api/v1/marketplaces/tools', ensureAuthenticated, async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'tools')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'tools', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    ...fileDataObj,
                    id: index,
                    templateName: file.split('.json')[0]
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // Get all triggers for marketplaces
        this.app.get('/api/v1/marketplaces/triggers', ensureAuthenticated, async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'triggers')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'triggers', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    ...fileDataObj,
                    id: index,
                    templateName: file.split('.json')[0]
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // Get all handlers for marketplaces
        this.app.get('/api/v1/marketplaces/handlers', ensureAuthenticated, async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces', 'handlers')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', 'handlers', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    ...fileDataObj,
                    id: index,
                    templateName: file.split('.json')[0]
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // ----------------------------------------
        // API Keys
        // ----------------------------------------

        // Get api keys
        this.app.get('/api/v1/apikey', async (req: Request, res: Response) => {
            const keys = await getAPIKeys()
            return res.json(keys)
        })

        // Add new api key
        this.app.post('/api/v1/apikey', async (req: Request, res: Response) => {
            const keys = await addAPIKey(req.body.keyName)
            return res.json(keys)
        })

        // Update api key
        this.app.put('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await updateAPIKey(req.params.id, req.body.keyName)
            return res.json(keys)
        })

        // Delete new api key
        this.app.delete('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await deleteAPIKey(req.params.id)
            return res.json(keys)
        })

        // Verify api key
        this.app.get('/api/v1/verify/apikey/:apiKey', async (req: Request, res: Response) => {
            try {
                const apiKey = await getApiKey(req.params.apiKey)
                if (!apiKey) return res.status(401).send('Unauthorized')
                return res.status(200).send('OK')
            } catch (err: any) {
                return res.status(500).send(err?.message)
            }
        })

        // ----------------------------------------
        // Serve UI static
        // ----------------------------------------

        const packagePath = getNodeModulesPackagePath('flowise-ui')
        const uiBuildPath = path.join(packagePath, 'build')
        const uiHtmlPath = path.join(packagePath, 'build', 'index.html')

        this.app.use('/', express.static(uiBuildPath))

        // All other requests not handled will return React app
        this.app.use((req, res) => {
            res.sendFile(uiHtmlPath)
        })
    }

    /**
     * Validate API Key
     * @param {Request} req
     * @param {Response} res
     * @param {ChatFlow} chatflow
     */
    async validateKey(req: Request, res: Response, chatflow: ChatFlow) {
        const chatFlowApiKeyId = chatflow.apikeyid
        const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''

        if (chatFlowApiKeyId && !authorizationHeader) return res.status(401).send(`Unauthorized`)

        const suppliedKey = authorizationHeader.split(`Bearer `).pop()
        if (chatFlowApiKeyId && suppliedKey) {
            const keys = await getAPIKeys()
            const apiSecret = keys.find((key) => key.id === chatFlowApiKeyId)?.apiSecret
            if (!compareKeys(apiSecret, suppliedKey)) return res.status(401).send(`Unauthorized`)
        }
    }

    /**
     * Process Prediction
     * @param {Request} req
     * @param {Response} res
     * @param {Server} socketIO
     * @param {boolean} isInternal
     */
    async processPrediction(req: Request, res: Response, socketIO?: Server, isInternal = false) {
        try {
            const chatflowid = req.params.id
            let incomingInput: IncomingInput = req.body

            let nodeToExecuteData: INodeData

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            let chatId = await getChatId(chatflow.id)
            if (!chatId) chatId = chatflowid

            if (!isInternal) {
                await this.validateKey(req, res, chatflow)
            }

            let isStreamValid = false

            const files = (req.files as any[]) || []

            if (files.length) {
                const overrideConfig: ICommonObject = { ...req.body }
                for (const file of files) {
                    const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                    const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                    const fileInputField = mapMimeTypeToInputField(file.mimetype)
                    if (overrideConfig[fileInputField]) {
                        overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                    } else {
                        overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                    }
                }
                incomingInput = {
                    question: req.body.question ?? 'hello',
                    overrideConfig,
                    history: [],
                    socketIOClientId: req.body.socketIOClientId
                }
            }

            /*** Get chatflows and prepare data  ***/
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges

            /*   Reuse the flow without having to rebuild (to avoid duplicated upsert, recomputation) when all these conditions met:
             * - Node Data already exists in pool
             * - Still in sync (i.e the flow has not been modified since)
             * - Existing overrideConfig and new overrideConfig are the same
             * - Flow doesn't start with/contain nodes that depend on incomingInput.question
             ***/
            const isFlowReusable = () => {
                return (
                    Object.prototype.hasOwnProperty.call(this.chatflowPool.activeChatflows, chatflowid) &&
                    this.chatflowPool.activeChatflows[chatflowid].inSync &&
                    isSameOverrideConfig(
                        isInternal,
                        this.chatflowPool.activeChatflows[chatflowid].overrideConfig,
                        incomingInput.overrideConfig
                    ) &&
                    !isStartNodeDependOnInput(this.chatflowPool.activeChatflows[chatflowid].startingNodes, nodes)
                )
            }

            if (isFlowReusable()) {
                nodeToExecuteData = this.chatflowPool.activeChatflows[chatflowid].endingNodeData
                isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
                logger.debug(
                    `[server]: Reuse existing chatflow ${chatflowid} with ending node ${nodeToExecuteData.label} (${nodeToExecuteData.id})`
                )
            } else {
                /*** Get Ending Node with Directed Graph  ***/
                const { graph, nodeDependencies } = constructGraphs(nodes, edges)
                const directedGraph = graph
                const endingNodeId = getEndingNode(nodeDependencies, directedGraph)
                if (!endingNodeId) return res.status(500).send(`Ending node ${endingNodeId} not found`)

                const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
                if (!endingNodeData) return res.status(500).send(`Ending node ${endingNodeId} data not found`)

                if (endingNodeData && endingNodeData.category !== 'Chains' && endingNodeData.category !== 'Agents') {
                    return res.status(500).send(`Ending node must be either a Chain or Agent`)
                }

                if (
                    endingNodeData.outputs &&
                    Object.keys(endingNodeData.outputs).length &&
                    !Object.values(endingNodeData.outputs).includes(endingNodeData.name)
                ) {
                    return res
                        .status(500)
                        .send(
                            `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                        )
                }

                isStreamValid = isFlowValidForStream(nodes, endingNodeData)

                /*** Get Starting Nodes with Non-Directed Graph ***/
                const constructedObj = constructGraphs(nodes, edges, true)
                const nonDirectedGraph = constructedObj.graph
                const { startingNodeIds, depthQueue } = getStartingNodes(nonDirectedGraph, endingNodeId)

                logger.debug(`[server]: Start building chatflow ${chatflowid}`)
                /*** BFS to traverse from Starting Nodes to Ending Node ***/
                const reactFlowNodes = await buildLangchain(
                    startingNodeIds,
                    nodes,
                    graph,
                    depthQueue,
                    this.nodesPool.componentNodes,
                    incomingInput.question,
                    incomingInput.history,
                    chatId,
                    chatflowid,
                    this.AppDataSource,
                    incomingInput?.overrideConfig,
                    this.cachePool
                )

                const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
                if (!nodeToExecute) return res.status(404).send(`Node ${endingNodeId} not found`)

                if (incomingInput.overrideConfig)
                    nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
                const reactFlowNodeData: INodeData = resolveVariables(
                    nodeToExecute.data,
                    reactFlowNodes,
                    incomingInput.question,
                    incomingInput.history
                )
                nodeToExecuteData = reactFlowNodeData

                const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))
                this.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
            }

            const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const nodeInstance = new nodeModule.nodeClass()

            logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

            if (nodeToExecuteData.instance) checkMemorySessionId(nodeToExecuteData.instance, chatId)

            const result = isStreamValid
                ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatHistory: incomingInput.history,
                      socketIO,
                      socketIOClientId: incomingInput.socketIOClientId,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic
                  })
                : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatHistory: incomingInput.history,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic
                  })

            logger.debug(`[server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)
            return res.json(result)
        } catch (e: any) {
            logger.error('[server]: Error:', e)
            return res.status(500).send(e.message)
        }
    }

    /**
     * Process Automation
     * @param {Request} req
     * @param {Response} res
     * @param {string} method
     */
    async processAutomation(req: Request, res: Response, isInternal = false, socketIO?: Server) {
        try {
            // first parse the information from the request
            const automationUrlId = req.params.id
            // get the coorelating automation
            const automation = await this.AppDataSource.getRepository(Automation).findOneBy({
                url: automationUrlId
            })
            if (!automation) return res.status(404).send(`Automation ${automationUrlId} not found`)
            if (!automation.enabled) return res.status(404).send(`Automation ${automationUrlId} is not enabled`)

            // get the coorelating trigger
            const trigger = await this.AppDataSource.getRepository(Trigger).findOneBy({
                id: automation.triggerid
            })
            if (!trigger) return res.status(404).send(`Trigger ${automation.triggerid} not found for automation`)
            // get the coorelating trigger
            const handler = await this.AppDataSource.getRepository(AutomationHandler).findOneBy({
                id: automation.handlerid
            })
            if (!handler) return res.status(404).send(`Handler ${automation.handlerid} not found for automation`)

            const chatflowid = automation.chatflowid

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            // first handle the case where the automation is an interval
            if (Number(automation.interval) > 0) {
                // TODO - need to implament this with celery
                console.log('interval automation')
            }

            // next, if there is a trigger function, run it on the input
            let input = null
            const body = req.body
            if (trigger.func) {
                try {
                    input = await JsRunner(trigger.func, input, body, res)
                } catch (e) {
                    return res.status(404).send('Failed to run trigger function')
                }
            } else {
                if (automation.definedQuestions) {
                    return res
                        .status(404)
                        .send('No trigger fuction found and no predefined defined questions given. Please provide one or the other')
                }
            }

            // next, handle the prediction with the chatflow
            let incomingInput: IncomingInput

            let inputs = []
            if (automation.definedQuestions) {
                // if there is a list of predefined questions, loop through them
                // and add them to the inputs that will be asked
                for (const question of automation.definedQuestions.split('-')) {
                    incomingInput = {
                        question: question.trim(),
                        history: []
                    }
                    inputs.push(incomingInput)
                }
            } else {
                incomingInput = {
                    question: input,
                    history: []
                }
                inputs.push(incomingInput)
            }

            let combinedOutupts = ''
            // loop though all the inputs and run the prediction. combine them into single output
            for (const input of inputs) {
                // TODO CMAN - this should be incorperated into the processPrediction function
                // doing so will ensure consistency between the two
                // I just don't have time to do it right now
                if (input.question === '' || input.question === null) {
                    continue
                }

                let { status, result } = await PredictionHandler(
                    input,
                    chatflow,
                    isInternal,
                    chatflowid,
                    this.chatflowPool,
                    this.nodesPool,
                    this.AppDataSource,
                    this.cachePool,
                    socketIO
                )

                if (status === false) {
                    return res.status(404).send(result)
                } else {
                    // combine the outputs
                    combinedOutupts = combinedOutupts + '\n\n' + input.question + ':' + '\n' + result
                }
            }

            // finally, use the handler
            if (handler.func) {
                try {
                    await JsRunner(handler.func, combinedOutupts, body, null)
                } catch (e) {
                    logger.error('[server]: Error:', e)
                    return res.status(404).send('Failed to run handler function')
                }
            } else {
                return res.status(404).send('No handler fuction found')
            }
        } catch (e: any) {
            logger.error('[server]: Error:', e)
            return res.status(500).send(e.message)
        }
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            await Promise.all(removePromises)
        } catch (e) {
            logger.error(`❌[server]: Flowise Server shut down error: ${e}`)
        }
    }
}

/**
 * Get first chat message id
 * @param {string} chatflowid
 * @returns {string}
 */
export async function getChatId(chatflowid: string) {
    // first chatmessage id as the unique chat id
    const firstChatMessage = await getDataSource()
        .getRepository(ChatMessage)
        .createQueryBuilder('cm')
        .select('cm.id')
        .where('chatflowid = :chatflowid', { chatflowid })
        .orderBy('cm.createdDate', 'ASC')
        .getOne()
    return firstChatMessage ? firstChatMessage.id : ''
}

let serverApp: App | undefined

export async function getAllChatFlow(): Promise<IChatFlow[]> {
    return await getDataSource().getRepository(ChatFlow).find()
}

export async function start(): Promise<void> {
    serverApp = new App()

    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    })

    await serverApp.initDatabase()
    await serverApp.config(io)

    server.listen(port, () => {
        logger.info(`⚡️ [server]: Flowise Server is listening at ${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
