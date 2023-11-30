import axios from 'axios'
import querystring from 'querystring'
import express, { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import passport from 'passport'
const GoogleStrategy = require('passport-google-oauth20').Strategy
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import http from 'http'
import * as fs from 'fs'
import basicAuth from 'express-basic-auth'
import { Server } from 'socket.io'
import logger from './utils/logger'
import { expressRequestLogger } from './utils/logger'
import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import { Between, IsNull, FindOptionsWhere } from 'typeorm'
import { MilvusClient } from '@zilliz/milvus2-sdk-node'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { OpenAiFiles } from './utils/openAiHelpers'
import { StripeSubscription, loginOrCreateUser } from './utils/subscriptionMethods'

import {
    IChatFlow,
    IncomingInput,
    IReactFlowNode,
    IReactFlowObject,
    INodeData,
    ICredentialReturnResponse,
    chatType,
    IChatMessage,
    IReactFlowEdge
} from './Interface'
import {
    getNodeModulesPackagePath,
    getStartingNodes,
    buildLangchain,
    getEndingNode,
    constructGraphs,
    resolveVariables,
    isStartNodeDependOnInput,
    mapMimeTypeToInputField,
    findAvailableConfigs,
    isSameOverrideConfig,
    isFlowValidForStream,
    databaseEntities,
    transformToCredentialEntity,
    decryptCredentialData,
    clearAllSessionMemory,
    replaceInputsWithConfig,
    getEncryptionKey,
    checkMemorySessionId,
    clearSessionMemoryFromViewMessageDialog,
    getUserHome,
    replaceChatHistory
} from './utils'
import { getDbAddress, getPartitionName } from './utils/CollectionsHelper'
import { getApiKey, getAPIKeys, addAPIKey, updateAPIKey, deleteAPIKey, compareKeys } from './utils/apiKeyHelpers'
import MilvusUpsert from './utils/Upsert'
import whitelistNodes from './utils/whitelistNodes'
import { cloneDeep, omit, uniqWith, isEqual } from 'lodash'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { User } from './database/entities/User'
import { Subscription } from './database/entities/Subscription'
import { ChatFlow } from './database/entities/ChatFlow'
import { Automation } from './database/entities/Automation'
import { Trigger } from './database/entities/Trigger'
import { AutomationHandler } from './database/entities/AutomationHandler'
import { ChatMessage } from './database/entities/ChatMessage'
import { Credential } from './database/entities/Credential'
import { Tool } from './database/entities/Tool'
import { RemoteDb } from './database/entities/RemoteDb'
import { Assistant } from './database/entities/Assistant'
import { ChatflowPool } from './ChatflowPool'
import { CachePool } from './CachePool'
import { ICommonObject, IMessage, INodeOptionsValue } from 'flowise-components'
import { createRateLimiter, getRateLimiter, initializeRateLimiter } from './utils/rateLimit'
import { handleAutomationInterval, removeAutomationInterval } from './utils/scheduler'
import { RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { Document } from 'langchain/document'

// import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'

// TODO CMAN - chang this for input
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// used for testing and development - dev user login creds are used
const DEV_MODE = process.env.NODE_ENV === 'dev'
// TODO CMAN - in future add dev mode to ambient-local
const DEV_MILVUS_PORT = process.env.DEV_MILVUS_PORT

const DEPLOYED_URL = process.env.DEPLOYED_URL
const GOOGLE_CLIENT_ID = '530294522870-o17j0nite5q2tcslg0tsn1li9bh4rtv3.apps.googleusercontent.com'
const GOOGLE_CLIENT_SECRET = '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'
const DEFAULT_GOOGLE_CALLBACK = `${DEPLOYED_URL}/api/v1/auth/google/callback`
import { replaceAllAPIKeys } from './utils/apiKey'

export class App {
    app: express.Application
    nodesPool: NodesPool
    chatflowPool: ChatflowPool
    cachePool: CachePool
    AppDataSource = getDataSource()
    openaiFiles = new OpenAiFiles()
    subscriptionMethod = new StripeSubscription()

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
                '/api/v1/vector/upsert/',
                '/api/v1/node-icon/',
                '/api/v1/components-credentials-icon/',
                '/api/v1/chatflows-streaming',
                '/api/v1/openai-assistants-file',
                '/api/v1/ip'
            ]
            this.app.use((req, res, next) => {
                if (req.url.includes('/api/v1/')) {
                    whitelistURLs.some((url) => req.url.includes(url)) ? next() : basicAuthMiddleware(req, res, next)
                } else next()
            })
        }

        const upload = multer({ dest: `${path.join(__dirname, '..', 'uploads')}/` })

        // Check if DYNAMODB_TABLE is provided, then use DynamoDB; otherwise, use default in-memory store
        let sessionStore
        if (process.env.DYNAMODB_TABLE) {
            logger.info('📦 [server]: Using DynamoDb session')
            const DynamoDBStore = require('connect-dynamodb')({ session: session })

            if (
                !process.env.AWS_ACCESS_KEY_ID ||
                !process.env.AWS_SECRET_ACCESS_KEY ||
                !process.env.DYNAMODB_REGION ||
                !process.env.DYNAMODB_TABLE
            ) {
                throw new Error('AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION must be set in server .env when using DynamoDB')
            }

            // Configure the region
            const awsConfig = {
                region: process.env.DYNAMODB_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }

            var options = {
                // Optional DynamoDB table name, defaults to 'sessions'
                table: process.env.DYNAMODB_TABLE,
                // Optional client for alternate endpoint, such as DynamoDB Local
                client: new DynamoDB(awsConfig)
            }

            // Configure sessionStore to use DynamoDB
            sessionStore = new DynamoDBStore(options)
        } else {
            logger.info('📦 [server]: Using default in-memory session store')
            sessionStore = new session.MemoryStore()
        }

        this.app.use(
            session({
                store: sessionStore,
                secret: process.env.SESSION_SECRET || 'secret-key', // Use env variable for the secret
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

            res.status(401).send('Unauthorized')
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

        passport.use(
            new GoogleStrategy(
                {
                    clientID: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    callbackURL: DEFAULT_GOOGLE_CALLBACK
                },
                async (accessToken: any, refreshToken: any, profile: any, done: any) => {
                    // Check if user exists in the database
                    profile.loginType = 'google'
                    const loginData = {
                        id: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        oauthType: 'google'
                    }

                    // for oauth, always sign up the user if they don't exist
                    const loginResponse = await loginOrCreateUser(true, loginData, this.subscriptionMethod, this.AppDataSource)

                    if (loginResponse.code !== 200) {
                        // TODO CMAN - better error handling for improperly logged in user
                        return done(null, false)
                    }

                    return done(null, loginResponse.user)
                }
            )
        )

        // ----------------------------------------
        // Login
        // ----------------------------------------

        // Login no oauth client
        this.app.post('/api/v1/login', async (req, res, next) => {
            if (DEV_MODE) {
                // Simulate a successful authentication with default user values
                const defaultUser = {
                    id: '123456789',
                    name: 'Dev User',
                    email: 'devuser@example.com',
                    oauthType: 'dev'
                }
                // for dev user, always sign up the user if they don't exist
                const loginResponse = await loginOrCreateUser(true, defaultUser, this.subscriptionMethod, this.AppDataSource)

                if (loginResponse.code !== 200) {
                    return res.status(loginResponse.code).send(loginResponse.error)
                }

                logger.info('🔧 [server]: DEV_MODE logged in')

                // Manually log the user in
                req.logIn(loginResponse.user as User, async (err) => {
                    if (err) {
                        return next(err)
                    }

                    // Directly call to add the milvus and client url to the database (these are from ENV)
                    try {
                        await handleRemoteDb({
                            id: (loginResponse.user as User).id,
                            url: `http://server.ambientware.co:${DEV_MILVUS_PORT}`
                        })
                    } catch (error) {
                        logger.error('❌ [server]: Error in handleRemoteDb:', error)
                    }

                    return res.redirect('/chatflows')
                })

                // prevent further action
                return
            }

            const body = req.body
            const profile = {
                name: body.name,
                email: body.email,
                password: body.password
            }

            // TODO CMAN - can be removed after beta testing
            if (body.accessCode !== process.env.ACCESS_CODE) {
                return res.status(401).send('Unauthorized')
            }

            // only sign up the user if the information is provided from signup form... not login form
            const loginResponse = await loginOrCreateUser(req.body.signup, profile, this.subscriptionMethod, this.AppDataSource)

            if (loginResponse.code !== 200) {
                return res.status(loginResponse.code).send(loginResponse.error)
            }

            req.logIn(loginResponse.user as User, async (err) => {
                if (err) {
                    return res.status(500).send('Error during login')
                }

                return res.redirect('/chatflows')
            })
        })

        // Logout route
        this.app.get('/logout', (req, res) => {
            // Invalidate the user session
            // TODO CMAN - better error handling
            req.logout(function (err) {})

            res.clearCookie('connect.sid') // Clear the session cookie
            return res.redirect('/') // Redirect after logout
        })

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
                prompt: 'consent'
            })(req, res, next)
        })

        this.app.get(
            '/api/v1/auth/google/callback',
            async (req, res, next) => {
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
        // Payment and subscription handling (with Stripe)
        // ----------------------------------------

        // get all subscirption levels/products
        this.app.get('/api/v1/subscriptions', async (req, res) => {
            try {
                const subscriptions = await this.subscriptionMethod.getSubscriptionOptions()

                // check if the user has a subscription
                const user = req.user as User
                const userSubscription = await this.AppDataSource.getRepository(Subscription).findOneBy({
                    user: user
                })

                if (userSubscription) {
                    // if the user has a subscription, add the subscription status to the subscription object
                    const subscription = subscriptions?.find((sub) => sub.priceId === userSubscription.details.plan.id)
                    if (subscription) {
                        subscription.current = true
                    }
                }

                // The list method is paginated, you can iterate through additional pages
                // or use auto-pagination to fetch additional payment-link beyond the initial list
                return res.json(subscriptions) // This will be an array of payment-link objects
            } catch (error) {
                logger.error(`Error retrieving prices: ${error}`)
                return res.status(404).send(`Error retrieving prices: ${error}`)
            }
        })

        // get subscription status for a user
        this.app.get('/api/v1/subscriptions/user', ensureAuthenticated, async (req, res) => {
            const user = req.user as User
            const userSubscription = await this.AppDataSource.getRepository(Subscription).findOneBy({
                user: user
            })

            const details = {
                name: user.name,
                status: userSubscription?.status,
                plan: userSubscription?.product.name
            }

            res.status(200).json(details)
        })

        // get checkout session for a subscription and user
        this.app.post('/api/v1/subscriptions/checkout', async (req, res) => {
            const session = await this.subscriptionMethod.createSession(req.user as User, req.body.priceId)

            res.status(200).json({ url: session?.url || '' })
        })

        // get subscription portal for a user
        this.app.get('/api/v1/subscriptions/portal', async (req, res) => {
            const portalSession = await this.subscriptionMethod.getCustomerPortal(req.user as User)

            res.status(200).json({ url: portalSession?.url || '' })
        })

        this.app.get('/api/v1/subscriptions/status', async (req, res) => {
            res.redirect('/chatflows')
        })

        // get all subscirption levels/products
        this.app.post('/api/v1/subscriptions/event', async (req, res) => {
            const eventData = await this.subscriptionMethod.handleEvent(req.body, this.AppDataSource)

            return res.status(200).send('ok')
        })

        // get all products
        this.app.get('/api/v1/subscriptions/products', async (req, res) => {
            try {
                // will return all products (max 100)
                const products = await this.subscriptionMethod.getAllProducts()

                return res.json(products) // This will be an list of product objects
            } catch (error) {
                logger.error(`Error retrieving products: ${error}`)
                return res.status(404).send(`Error retrieving products: ${error}`)
            }
        })

        // ----------------------------------------
        // Oauth for various services
        // ----------------------------------------

        // initical oauth handler for google
        this.app.get('/api/v1/oauth/google', (req, res) => {
            const CLIENT_ID = GOOGLE_CLIENT_ID
            const redirectUrl = `${DEPLOYED_URL}/api/v1/credentials/from-google-oauth`

            const googleAuthURL = 'https://accounts.google.com/o/oauth2/v2/auth'
            const scope = [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.compose', // For sending emails
                'https://www.googleapis.com/auth/drive' // For full access to Google Drive
            ].join(' ')

            // Construct the Google URL to which we'll redirect the user
            // must be offline mode to get the refresh token
            const authURL = `${googleAuthURL}?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`

            res.redirect(authURL)
        })

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
                if (!whitelistNodes.includes(nodeName)) continue // skip over nodes that are whitelist
                const clonedNode = cloneDeep(this.nodesPool.componentNodes[nodeName])
                returnData.push(clonedNode)
            }
            return res.json(returnData)
        })

        // Get all document loader nodes
        this.app.get('/api/v1/nodes/complete', (req: Request, res: Response) => {
            const returnData = []
            for (const nodeName in this.nodesPool.componentNodes) {
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

        // Get the demo chatflow id
        this.app.get('/api/v1/chatflows/demo', async (req: Request, res: Response) => {
            const demoId = process.env.DEMO_CHATFLOW_ID

            if (!demoId) {
                return res.status(404).send(`Demo chatflow not found`)
            }

            return res.json({ id: demoId })
        })

        // Get specific chatflow via api key
        this.app.get('/api/v1/chatflows/apikey/:apiKey', async (req: Request, res: Response) => {
            try {
                const apiKey = await getApiKey(req.params.apiKey, req.user as User, this.AppDataSource)
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

            // chatFlowPool is initialized only when a flow is opened
            // if the user attempts to rename/update category without opening any flow, chatFlowPool will be undefined
            if (this.chatflowPool) {
                // Update chatflowpool inSync to false, to build Langchain again because data has been changed
                this.chatflowPool.updateInSync(chatflow.id, false)
            }

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
            const sortOrder = req.query?.order as string | undefined
            const chatId = req.query?.chatId as string | undefined
            const memoryType = req.query?.memoryType as string | undefined
            const sessionId = req.query?.sessionId as string | undefined
            const startDate = req.query?.startDate as string | undefined
            const endDate = req.query?.endDate as string | undefined
            let chatTypeFilter = req.query?.chatType as chatType | undefined

            if (chatTypeFilter) {
                try {
                    const chatTypeFilterArray = JSON.parse(chatTypeFilter)
                    if (chatTypeFilterArray.includes(chatType.EXTERNAL) && chatTypeFilterArray.includes(chatType.INTERNAL)) {
                        chatTypeFilter = undefined
                    } else if (chatTypeFilterArray.includes(chatType.EXTERNAL)) {
                        chatTypeFilter = chatType.EXTERNAL
                    } else if (chatTypeFilterArray.includes(chatType.INTERNAL)) {
                        chatTypeFilter = chatType.INTERNAL
                    }
                } catch (e) {
                    return res.status(500).send(e)
                }
            }

            const chatmessages = await this.getChatMessage(
                req.params.id,
                chatTypeFilter,
                sortOrder,
                chatId,
                memoryType,
                sessionId,
                startDate,
                endDate
            )
            return res.json(chatmessages)
        })

        // Get internal chatmessages from chatflowid
        this.app.get('/api/v1/internal-chatmessage/:id', async (req: Request, res: Response) => {
            const chatmessages = await this.getChatMessage(req.params.id, chatType.INTERNAL)
            return res.json(chatmessages)
        })

        // Add chatmessages for chatflowid
        this.app.post('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const body = req.body
            const currentUser = req.user as User
            const results = await this.addChatMessage(body, currentUser)
            return res.json(results)
        })

        // Delete all chatmessages from chatId
        this.app.delete('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const chatflowid = req.params.id
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) {
                res.status(404).send(`Chatflow ${chatflowid} not found`)
                return
            }
            const chatId = (req.query?.chatId as string) ?? (await getChatId(chatflowid))
            const memoryType = req.query?.memoryType as string | undefined
            const sessionId = req.query?.sessionId as string | undefined
            const chatType = req.query?.chatType as string | undefined
            const isClearFromViewMessageDialog = req.query?.isClearFromViewMessageDialog as string | undefined

            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes

            if (isClearFromViewMessageDialog) {
                await clearSessionMemoryFromViewMessageDialog(
                    nodes,
                    this.nodesPool.componentNodes,
                    chatId,
                    this.AppDataSource,
                    sessionId,
                    memoryType
                )
            } else {
                await clearAllSessionMemory(nodes, this.nodesPool.componentNodes, chatId, this.AppDataSource, sessionId)
            }

            const deleteOptions: FindOptionsWhere<ChatMessage> = { chatflowid, chatId }
            if (memoryType) deleteOptions.memoryType = memoryType
            if (sessionId) deleteOptions.sessionId = sessionId
            if (chatType) deleteOptions.chatType = chatType

            const results = await this.AppDataSource.getRepository(ChatMessage).delete(deleteOptions)
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

        // Create new credential from oauth data
        this.app.get('/api/v1/credentials/from-google-oauth', async (req: Request, res: Response) => {
            let accessToken = null
            let refreshToken = null
            let userProfile = null

            try {
                const redirectUri = `${DEPLOYED_URL}/api/v1/credentials/from-google-oauth`
                // This is where Google sends the authorization code after user consent
                const code = req.query.code as string

                const tokenURL = 'https://oauth2.googleapis.com/token'

                const response = await axios.post(
                    tokenURL,
                    querystring.stringify({
                        code: code,
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        redirect_uri: redirectUri,
                        grant_type: 'authorization_code'
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                )

                const { access_token, refresh_token } = response.data

                // Fetch the user's profile data using the access token
                const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                })

                userProfile = profileResponse.data

                // assign the tokens
                accessToken = access_token
                refreshToken = refresh_token
            } catch (error) {
                logger.error('❌ [server]: Error in Google OAuth callback')
                return res.redirect('/oauth-complete/failed')
            }

            if (accessToken && refreshToken) {
                const obj = {
                    name: userProfile.email,
                    credentialName: 'googleApi',
                    plainDataObj: { googleApiKey: { accessToken: accessToken, refreshToken: refreshToken } }
                }

                const newCredential = await transformToCredentialEntity(obj)
                newCredential.user = req.user as User

                // check to see if credential already exists
                const existingCredential = await this.AppDataSource.getRepository(Credential).findOneBy({
                    name: userProfile.email,
                    credentialName: obj.credentialName
                })

                // if we have a credential already, just update it
                if (existingCredential) {
                    this.AppDataSource.getRepository(Credential).merge(existingCredential, newCredential)
                    const result = await this.AppDataSource.getRepository(Credential).save(existingCredential)
                } else {
                    const credential = this.AppDataSource.getRepository(Credential).create(newCredential)
                    const results = await this.AppDataSource.getRepository(Credential).save(credential)
                }

                return res.redirect('/oauth-complete/success')
            } else {
                logger.error('❌ [server]: Error updating tokens')
                return res.redirect('/oauth-complete/failed')
            }
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

        // Refresh credential based on refresh token
        this.app.post('/api/v1/credentials/refresh-token', async (req: Request, res: Response) => {
            const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                id: req.body.id
            })

            if (!credential) return res.status(404).send(`Credential ${req.params.id} not found`)

            const decryptedCredentialData = await decryptCredentialData(
                credential.encryptedData,
                credential.credentialName,
                this.nodesPool.componentCredentials
            )

            const refreshToken = (decryptedCredentialData as any).googleApiKey.refreshToken

            const CLIENT_ID = GOOGLE_CLIENT_ID
            const CLIENT_SECRET = GOOGLE_CLIENT_SECRET
            const REFRESH_URL = 'https://oauth2.googleapis.com/token'

            const updateResponse = await axios.post(REFRESH_URL, {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })

            const refreshedInformation = {
                name: credential.name,
                credentialName: credential.credentialName,
                plainDataObj: { googleApiKey: { accessToken: updateResponse.data.access_token, refreshToken: refreshToken } }
            }

            const updateCredential = await transformToCredentialEntity(refreshedInformation)
            this.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
            const result = await this.AppDataSource.getRepository(Credential).save(credential)

            return res.json({ token: updateResponse.data.access_token })
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
                const automation = await this.AppDataSource.getRepository(Automation).findOneBy({
                    url: req.params.id
                })
                handleAutomationInterval(automation)
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
            const automation = await this.AppDataSource.getRepository(Automation).findOneBy({
                id: req.params.id
            })
            return res.json(automation)
        })

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

                    let automationOutput
                    let updateInterval
                    if (!automation) {
                        // always update interval if automation does not exist
                        updateInterval = true

                        // no automation so we have to make a new one
                        const newAutomation = new Automation()
                        Object.assign(newAutomation, auto)
                        newAutomation.user = req.user as User
                        automationOutput = this.AppDataSource.getRepository(Automation).create(newAutomation)
                        const results = await this.AppDataSource.getRepository(Automation).save(automationOutput)
                        if (!results) return res.status(500).send(`Error when creating automation`)
                    } else {
                        // automation exists so we update it
                        const updatedAutomation = new Automation()
                        Object.assign(updatedAutomation, auto)
                        updatedAutomation.user = req.user as User

                        // update interval if its enabled status has changed or if the interval has changed when enabled
                        updateInterval = auto.enabled === automation.enabled ? false : true
                        if (auto.enabled && auto.enabled === automation.enabled) {
                            updateInterval = auto.interval === automation.interval ? false : true
                        }

                        // update the automation
                        automationOutput = automation
                        this.AppDataSource.getRepository(Automation).merge(automation, updatedAutomation)
                        const results = await this.AppDataSource.getRepository(Automation).save(automation)
                        if (!results) return res.status(500).send(`Error when updating automation`)
                    }

                    // always update the automation interval if it is disabled
                    // update the automation interval if needed
                    updateInterval && handleAutomationInterval(automationOutput)
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
                    // make sure to clear the interval if it is running
                    removeAutomationInterval(auto)
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
        // Assistant
        // ----------------------------------------

        // Get all assistants
        this.app.get('/api/v1/assistants', ensureAuthenticated, async (req: Request, res: Response) => {
            const assistants = await this.AppDataSource.getRepository(Assistant).findBy({
                user: req.user as User
            })

            return res.json(assistants)
        })

        // Get specific assistant
        this.app.get('/api/v1/assistants/:id', async (req: Request, res: Response) => {
            const assistant = await this.AppDataSource.getRepository(Assistant).findOneBy({
                id: req.params.id
            })
            return res.json(assistant)
        })

        // Get assistant object
        this.app.get('/api/v1/openai-assistants/:id', async (req: Request, res: Response) => {
            const credentialId = req.query.credential as string
            const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                id: credentialId
            })

            if (!credential) return res.status(404).send(`Credential ${credentialId} not found`)

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) return res.status(404).send(`OpenAI ApiKey not found`)

            const openai = new OpenAI({ apiKey: openAIApiKey })
            const retrievedAssistant = await openai.beta.assistants.retrieve(req.params.id)
            const resp = await openai.files.list()
            const existingFiles = resp.data ?? []

            if (retrievedAssistant.file_ids && retrievedAssistant.file_ids.length) {
                ;(retrievedAssistant as any).files = existingFiles.filter((file) => retrievedAssistant.file_ids.includes(file.id))
            }

            return res.json(retrievedAssistant)
        })

        // List available assistants
        this.app.get('/api/v1/openai-assistants', async (req: Request, res: Response) => {
            const credentialId = req.query.credential as string
            const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                id: credentialId
            })

            if (!credential) return res.status(404).send(`Credential ${credentialId} not found`)

            // Decrpyt credentialData
            const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
            const openAIApiKey = decryptedCredentialData['openAIApiKey']
            if (!openAIApiKey) return res.status(404).send(`OpenAI ApiKey not found`)

            const openai = new OpenAI({ apiKey: openAIApiKey })
            const retrievedAssistants = await openai.beta.assistants.list()

            return res.json(retrievedAssistants.data)
        })

        // Add assistant
        this.app.post('/api/v1/assistants', async (req: Request, res: Response) => {
            const body = req.body

            if (!body.details) return res.status(500).send(`Invalid request body`)

            const assistantDetails = JSON.parse(body.details)

            try {
                const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                    id: body.credential
                })

                if (!credential) return res.status(404).send(`Credential ${body.credential} not found`)

                // Decrpyt credentialData
                const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
                const openAIApiKey = decryptedCredentialData['openAIApiKey']
                if (!openAIApiKey) return res.status(404).send(`OpenAI ApiKey not found`)

                const openai = new OpenAI({ apiKey: openAIApiKey })

                let tools = []
                if (assistantDetails.tools) {
                    for (const tool of assistantDetails.tools ?? []) {
                        tools.push({
                            type: tool
                        })
                    }
                }

                if (assistantDetails.uploadFiles) {
                    // Base64 strings
                    let files: string[] = []
                    const fileBase64 = assistantDetails.uploadFiles
                    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                        files = JSON.parse(fileBase64)
                    } else {
                        files = [fileBase64]
                    }

                    const uploadedFiles = []
                    for (const file of files) {
                        const splitDataURI = file.split(',')
                        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                        const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', filename)
                        if (!fs.existsSync(path.join(getUserHome(), '.flowise', 'openai-assistant'))) {
                            fs.mkdirSync(path.dirname(filePath), { recursive: true })
                        }
                        if (!fs.existsSync(filePath)) {
                            fs.writeFileSync(filePath, bf)
                        }

                        const createdFile = await openai.files.create({
                            file: fs.createReadStream(filePath),
                            purpose: 'assistants'
                        })
                        uploadedFiles.push(createdFile)

                        fs.unlinkSync(filePath)
                    }
                    assistantDetails.files = [...assistantDetails.files, ...uploadedFiles]
                }

                if (!assistantDetails.id) {
                    const newAssistant = await openai.beta.assistants.create({
                        name: assistantDetails.name,
                        description: assistantDetails.description,
                        instructions: assistantDetails.instructions,
                        model: assistantDetails.model,
                        tools,
                        file_ids: (assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)
                    })
                    assistantDetails.id = newAssistant.id
                } else {
                    const retrievedAssistant = await openai.beta.assistants.retrieve(assistantDetails.id)
                    let filteredTools = uniqWith([...retrievedAssistant.tools, ...tools], isEqual)
                    filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

                    await openai.beta.assistants.update(assistantDetails.id, {
                        name: assistantDetails.name,
                        description: assistantDetails.description ?? '',
                        instructions: assistantDetails.instructions ?? '',
                        model: assistantDetails.model,
                        tools: filteredTools,
                        file_ids: uniqWith(
                            [
                                ...retrievedAssistant.file_ids,
                                ...(assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)
                            ],
                            isEqual
                        )
                    })
                }

                const newAssistantDetails = {
                    ...assistantDetails
                }
                if (newAssistantDetails.uploadFiles) delete newAssistantDetails.uploadFiles

                body.details = JSON.stringify(newAssistantDetails)
            } catch (error) {
                return res.status(500).send(`Error creating new assistant: ${error}`)
            }

            const newAssistant = new Assistant()
            Object.assign(newAssistant, body)
            newAssistant.user = req.user as User

            const assistant = this.AppDataSource.getRepository(Assistant).create(newAssistant)
            const results = await this.AppDataSource.getRepository(Assistant).save(assistant)

            return res.json(results)
        })

        // Update assistant
        this.app.put('/api/v1/assistants/:id', async (req: Request, res: Response) => {
            const assistant = await this.AppDataSource.getRepository(Assistant).findOneBy({
                id: req.params.id
            })

            if (!assistant) {
                res.status(404).send(`Assistant ${req.params.id} not found`)
                return
            }

            try {
                const openAIAssistantId = JSON.parse(assistant.details)?.id

                const body = req.body
                const assistantDetails = JSON.parse(body.details)

                const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                    id: body.credential
                })

                if (!credential) return res.status(404).send(`Credential ${body.credential} not found`)

                // Decrpyt credentialData
                const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
                const openAIApiKey = decryptedCredentialData['openAIApiKey']
                if (!openAIApiKey) return res.status(404).send(`OpenAI ApiKey not found`)

                const openai = new OpenAI({ apiKey: openAIApiKey })

                let tools = []
                if (assistantDetails.tools) {
                    for (const tool of assistantDetails.tools ?? []) {
                        tools.push({
                            type: tool
                        })
                    }
                }

                if (assistantDetails.uploadFiles) {
                    // Base64 strings
                    let files: string[] = []
                    const fileBase64 = assistantDetails.uploadFiles
                    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                        files = JSON.parse(fileBase64)
                    } else {
                        files = [fileBase64]
                    }

                    const uploadedFiles = []
                    for (const file of files) {
                        const splitDataURI = file.split(',')
                        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                        const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', filename)
                        if (!fs.existsSync(path.join(getUserHome(), '.flowise', 'openai-assistant'))) {
                            fs.mkdirSync(path.dirname(filePath), { recursive: true })
                        }
                        if (!fs.existsSync(filePath)) {
                            fs.writeFileSync(filePath, bf)
                        }

                        const createdFile = await openai.files.create({
                            file: fs.createReadStream(filePath),
                            purpose: 'assistants'
                        })
                        uploadedFiles.push(createdFile)

                        fs.unlinkSync(filePath)
                    }
                    assistantDetails.files = [...assistantDetails.files, ...uploadedFiles]
                }

                const retrievedAssistant = await openai.beta.assistants.retrieve(openAIAssistantId)
                let filteredTools = uniqWith([...retrievedAssistant.tools, ...tools], isEqual)
                filteredTools = filteredTools.filter((tool) => !(tool.type === 'function' && !(tool as any).function))

                await openai.beta.assistants.update(openAIAssistantId, {
                    name: assistantDetails.name,
                    description: assistantDetails.description,
                    instructions: assistantDetails.instructions,
                    model: assistantDetails.model,
                    tools: filteredTools,
                    file_ids: uniqWith(
                        [...retrievedAssistant.file_ids, ...(assistantDetails.files ?? []).map((file: OpenAI.Files.FileObject) => file.id)],
                        isEqual
                    )
                })

                const newAssistantDetails = {
                    ...assistantDetails,
                    id: openAIAssistantId
                }
                if (newAssistantDetails.uploadFiles) delete newAssistantDetails.uploadFiles

                const updateAssistant = new Assistant()
                body.details = JSON.stringify(newAssistantDetails)
                Object.assign(updateAssistant, body)

                this.AppDataSource.getRepository(Assistant).merge(assistant, updateAssistant)
                const result = await this.AppDataSource.getRepository(Assistant).save(assistant)

                return res.json(result)
            } catch (error) {
                return res.status(500).send(`Error updating assistant: ${error}`)
            }
        })

        // Delete assistant
        this.app.delete('/api/v1/assistants/:id', async (req: Request, res: Response) => {
            const assistant = await this.AppDataSource.getRepository(Assistant).findOneBy({
                id: req.params.id
            })

            if (!assistant) {
                res.status(404).send(`Assistant ${req.params.id} not found`)
                return
            }

            try {
                const assistantDetails = JSON.parse(assistant.details)

                const credential = await this.AppDataSource.getRepository(Credential).findOneBy({
                    id: assistant.credential
                })

                if (!credential) return res.status(404).send(`Credential ${assistant.credential} not found`)

                // Decrpyt credentialData
                const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
                const openAIApiKey = decryptedCredentialData['openAIApiKey']
                if (!openAIApiKey) return res.status(404).send(`OpenAI ApiKey not found`)

                const openai = new OpenAI({ apiKey: openAIApiKey })

                const results = await this.AppDataSource.getRepository(Assistant).delete({ id: req.params.id })

                if (req.query.isDeleteBoth) await openai.beta.assistants.del(assistantDetails.id)

                return res.json(results)
            } catch (error: any) {
                if (error.status === 404 && error.type === 'invalid_request_error') return res.send('OK')
                return res.status(500).send(`Error deleting assistant: ${error}`)
            }
        })

        // Download file from assistant
        this.app.post('/api/v1/openai-assistants-file', async (req: Request, res: Response) => {
            const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', req.body.fileName)
            res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(filePath))
            const fileStream = fs.createReadStream(filePath)
            fileStream.pipe(res)
        })

        // ----------------------------------------
        // Collections
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

            const endpointData = { url: reqBody.url }

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

        // load or unload a specific collection
        this.app.post('/api/v1/collections/load-unload/:source', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')

                const load = req.body.load
                const name = getPartitionName(req.user as User, req.body.collection, req.params.source)

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

                if (status.code !== 0) return res.status(400).send(status.reason)

                return res.json(status)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error loading/unloading collection')
            }
        })

        // query collection name to get docs info
        this.app.get('/api/v1/collections/query/:source/:name', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')
                const name = getPartitionName(req.user as User, req.params.name, req.params.source)

                const queryResult = await client.query({
                    // Return the name and schema of the collection.
                    collection_name: 'ambient',
                    filter: `partition in ['${name}']`,
                    output_fields: ['fileName']
                })

                if (queryResult.status.code !== 0) return res.status(400).send(queryResult.status.reason)

                return res.json(queryResult)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error querying collection')
            }
        })

        // return a list of collections belonging to a given user
        this.app.get('/api/v1/collections/:source', ensureAuthenticated, async (req: Request, res: Response) => {
            let collectionNames

            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')
                // collections = await client.showCollections()

                const collections = await client.query({
                    // Return the name and schema of the collection.
                    collection_name: 'ambient',
                    filter: `user in ['${String((req.user as User).id)}']`,
                    output_fields: ['partition']
                })

                if (collections.status.code !== 0) return res.status(400).send(collections.status.reason)

                collectionNames = collections.data.map((collection: any) => collection.partition)
                collectionNames = new Set(collectionNames) // keep only unique occurances

                const returnData: INodeOptionsValue[] = []
                for (let collection of collectionNames) {
                    const name = getPartitionName(req.user as User, collection, req.params.source)
                    const data = {
                        name: name.split('_').shift() // this will remove the user id from cloud collections
                    } as INodeOptionsValue
                    returnData.push(data)
                }

                return res.json(returnData)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error getting collections')
            }
        })

        // delete collection entities
        this.app.post('/api/v1/collections/entities/delete/:source', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')

                const milvusExpression = `langchain_primaryid in [${req.body.entities}]`

                const result = await client.deleteEntities({
                    // Return the name and schema of the collection.
                    collection_name: 'ambient',
                    expr: milvusExpression
                })

                if (result.status.code !== 0) return res.status(400).send(result.status.reason)

                return res.json(result)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error deleting entities')
            }
        })

        // delete a collection for a given user
        this.app.delete('/api/v1/collections/delete/:source/:name', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')

                const name = getPartitionName(req.user as User, req.params.name, req.params.source)

                const queryResult = await client.query({
                    // Return the name and schema of the collection.
                    collection_name: 'ambient',
                    filter: `partition in ['${name}']`,
                    output_fields: ['fileName']
                })

                if (queryResult.status.code !== 0) return res.status(400).send(queryResult.status.reason)

                const ids = queryResult.data.map((doc: any) => doc.langchain_primaryid)

                const milvusExpression = `langchain_primaryid in [${ids}]`

                const result = await client.deleteEntities({
                    // Return the name and schema of the collection.
                    collection_name: 'ambient',
                    expr: milvusExpression
                })

                return res.json(result)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error deleting collection')
            }
        })

        // update a collection from a given user
        this.app.post('/api/v1/collections/rename/:source', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)

            const clientConfig = {
                address: address as string,
                token: process.env.MILVUS_TOKEN || ''
            }

            try {
                const client = address ? new MilvusClient(clientConfig) : null
                if (!client) return res.status(400).send('Milvus client not found')

                const oldName = getPartitionName(req.user as User, req.body.oldName, req.params.source)
                const newName = getPartitionName(req.user as User, req.body.newName, req.params.source)

                const collection = await client.renameCollection({
                    // Return the name and schema of the collection.
                    collection_name: oldName,
                    new_collection_name: newName
                })

                return res.json(collection)
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error updating/renaming collection')
            }
        })

        // create a collection for a given user
        this.app.post('/api/v1/collections/create/:source', async (req: Request, res: Response) => {
            const address = await getDbAddress(req.user as User, req.params.source, this.AppDataSource)
            const partitionName = getPartitionName(req.user as User, req.body.name, req.params.source)

            const obj = {} as RecursiveCharacterTextSplitterParams
            obj.chunkSize = 1500
            obj.chunkOverlap = 200

            // TODO CMAN - make this dynamic. For now, we are just using the OpenAI embeddings
            const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
            // const embeddings = new HuggingFaceInferenceEmbeddings({model: 'sentence-transformers/all-MiniLM-L6-v2'}) // api key passed by env variable

            if (!embeddings) return res.status(400).send('Embeddings not found')

            const defaultSplitter = new RecursiveCharacterTextSplitter(obj)

            const additionalInfo = {
                textSplitter: defaultSplitter
            }

            const nodeData = req.body.nodeData
            nodeData.inputs = { ...nodeData.inputs, ...additionalInfo }

            const node = { ...this.nodesPool.componentNodes[req.params.name] } || null
            const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeData.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const nodeInstance = new nodeModule.nodeClass()

            if (!node) return res.status(400).send('Node not found')

            const options = {
                appDataSource: this.AppDataSource,
                databaseEntities: databaseEntities
            }

            let alldocs = await nodeInstance.init(nodeData, '', options)

            // only add metadata that is relevant to ambientware
            alldocs = alldocs.map((doc: Document) => {
                return {
                    ...doc,
                    metadata: { fileName: req.body.dataDescription, partition: partitionName, user: String((req.user as User).id) }
                }
            })

            const milvusArgs = {
                collectionName: 'ambient',
                url: address ? (address as string) : '',
                clientConfig: {
                    address: address as string,
                    token: process.env.MILVUS_TOKEN || ''
                }
            }

            try {
                const vectorStore = await MilvusUpsert.fromDocuments(alldocs, embeddings, milvusArgs)
                if (!vectorStore) return res.status(400).send('Vector store failed to create')

                // TODO CMAN - need to return something relevant
                return res.json('ok')
            } catch (e) {
                logger.error(e)
                return res.status(400).send('Error creating collection')
            }
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
        // Upsert
        // ----------------------------------------

        this.app.post(
            '/api/v1/vector/upsert/:id',
            upload.array('files'),
            (req: Request, res: Response, next: NextFunction) => getRateLimiter(req, res, next),
            async (req: Request, res: Response) => {
                await this.buildChatflow(req, res, undefined, false, true)
            }
        )

        this.app.post('/api/v1/vector/internal-upsert/:id', async (req: Request, res: Response) => {
            await this.buildChatflow(req, res, undefined, true, true)
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
                await this.buildChatflow(req, res, socketIO)
            }
        )

        // Send input message and get prediction result (Internal)
        this.app.post('/api/v1/internal-prediction/:id', async (req: Request, res: Response) => {
            await this.buildChatflow(req, res, socketIO, true)
        })

        // ----------------------------------------
        // Marketplaces
        // ----------------------------------------

        // Get all chatflows for marketplaces
        this.app.get('/api/v1/marketplaces/chatflows', async (req: Request, res: Response) => {
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
                    badge: fileDataObj?.badge,
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

        const addChatflowsCount = async (keys: any, res: Response) => {
            if (keys) {
                const updatedKeys: any[] = []
                //iterate through keys and get chatflows
                for (const key of keys) {
                    const chatflows = await this.AppDataSource.getRepository(ChatFlow)
                        .createQueryBuilder('cf')
                        .where('cf.apikeyid = :apikeyid', { apikeyid: key.id })
                        .getMany()
                    const linkedChatFlows: any[] = []
                    chatflows.map((cf) => {
                        linkedChatFlows.push({
                            flowName: cf.name,
                            category: cf.category,
                            updatedDate: cf.updatedDate
                        })
                    })
                    key.chatFlows = linkedChatFlows
                    updatedKeys.push(key)
                }
                return res.json(updatedKeys)
            }
            return res.json(keys)
        }
        // Get api keys
        this.app.get('/api/v1/apikey', ensureAuthenticated, async (req: Request, res: Response) => {
            const keys = await getAPIKeys(req.user as User, this.AppDataSource)
            return addChatflowsCount(keys, res)
        })

        // Add new api key
        this.app.post('/api/v1/apikey', async (req: Request, res: Response) => {
            const keys = await addAPIKey(req.body.keyName, req.user as User, this.AppDataSource)
            return addChatflowsCount([keys], res)
        })

        // Update api key
        this.app.put('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await updateAPIKey(req.params.id, req.body.keyName, req.user as User, this.AppDataSource)
            return addChatflowsCount([keys], res)
        })

        // Delete new api key
        this.app.delete('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await deleteAPIKey(req.params.id, req.user as User, this.AppDataSource)
            return addChatflowsCount([keys], res)
        })

        // Verify api key
        this.app.get('/api/v1/verify/apikey/:apiKey', async (req: Request, res: Response) => {
            try {
                const apiKey = await getApiKey(req.params.apiKey, req.user as User, this.AppDataSource)
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
    async validateKey(req: Request, chatflow: ChatFlow) {
        const chatFlowApiKeyId = chatflow.apikeyid
        if (!chatFlowApiKeyId) return true

        const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''
        if (chatFlowApiKeyId && !authorizationHeader) return false

        const suppliedKey = authorizationHeader.split(`Bearer `).pop()
        if (suppliedKey) {
            const keys = await getAPIKeys(req.user as User, this.AppDataSource)
            const apiSecret = keys.find((key) => key.id === chatFlowApiKeyId)?.apiSecret || ''
            if (!compareKeys(apiSecret, suppliedKey)) return false
            return true
        }
        return false
    }

    /**
     * Method that get chat messages.
     * @param {string} chatflowid
     * @param {chatType} chatType
     * @param {string} sortOrder
     * @param {string} chatId
     * @param {string} memoryType
     * @param {string} sessionId
     * @param {string} startDate
     * @param {string} endDate
     */
    async getChatMessage(
        chatflowid: string,
        chatType: chatType | undefined,
        sortOrder: string = 'ASC',
        chatId?: string,
        memoryType?: string,
        sessionId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<ChatMessage[]> {
        let fromDate
        if (startDate) fromDate = new Date(startDate)

        let toDate
        if (endDate) toDate = new Date(endDate)

        return await this.AppDataSource.getRepository(ChatMessage).find({
            where: {
                chatflowid,
                chatType,
                chatId,
                memoryType: memoryType ?? (chatId ? IsNull() : undefined),
                sessionId: sessionId ?? (chatId ? IsNull() : undefined),
                createdDate: toDate && fromDate ? Between(fromDate, toDate) : undefined
            },
            order: {
                createdDate: sortOrder === 'DESC' ? 'DESC' : 'ASC'
            }
        })
    }

    /**
     * Method that add chat messages.
     * @param {Partial<IChatMessage>} chatMessage
     */
    async addChatMessage(chatMessage: Partial<IChatMessage>, user: User): Promise<ChatMessage> {
        const newChatMessage = new ChatMessage()
        Object.assign(newChatMessage, chatMessage)
        newChatMessage.user = user as User

        const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
        return await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
    }

    /**
     * Method that find memory label that is connected within chatflow
     * In a chatflow, there should only be 1 memory node
     * @param {IReactFlowNode[]} nodes
     * @param {IReactFlowEdge[]} edges
     * @returns {string | undefined}
     */
    findMemoryLabel(nodes: IReactFlowNode[], edges: IReactFlowEdge[]): IReactFlowNode | undefined {
        const memoryNodes = nodes.filter((node) => node.data.category === 'Memory')
        const memoryNodeIds = memoryNodes.map((mem) => mem.data.id)

        for (const edge of edges) {
            if (memoryNodeIds.includes(edge.source)) {
                const memoryNode = nodes.find((node) => node.data.id === edge.source)
                return memoryNode
            }
        }
        return undefined
    }

    /**
     * Build Chatflow
     * @param {Request} req
     * @param {Response} res
     * @param {Server} socketIO
     * @param {boolean} isInternal
     * @param {boolean} isUpsert
     */
    async buildChatflow(req: Request, res: Response, socketIO?: Server, isInternal: boolean = false, isUpsert: boolean = false) {
        try {
            const chatflowid = req.params.id
            let incomingInput: IncomingInput = req.body

            let nodeToExecuteData: INodeData

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
            const userMessageDateTime = new Date()

            if (!isInternal) {
                const isKeyValidated = await this.validateKey(req, chatflow)
                if (!isKeyValidated) return res.status(401).send('Unauthorized')
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
                    socketIOClientId: req.body.socketIOClientId,
                    stopNodeId: req.body.stopNodeId
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
                    !isStartNodeDependOnInput(this.chatflowPool.activeChatflows[chatflowid].startingNodes, nodes) &&
                    !isUpsert
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

                if (endingNodeData && endingNodeData.category !== 'Chains' && endingNodeData.category !== 'Agents' && !isUpsert) {
                    return res.status(500).send(`Ending node must be either a Chain or Agent`)
                }

                if (
                    endingNodeData.outputs &&
                    Object.keys(endingNodeData.outputs).length &&
                    !Object.values(endingNodeData.outputs).includes(endingNodeData.name) &&
                    !isUpsert
                ) {
                    return res
                        .status(500)
                        .send(
                            `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                        )
                }

                isStreamValid = isFlowValidForStream(nodes, endingNodeData)

                let chatHistory: IMessage[] | string = incomingInput.history
                if (
                    endingNodeData.inputs?.memory &&
                    !incomingInput.history &&
                    (incomingInput.chatId || incomingInput.overrideConfig?.sessionId)
                ) {
                    const memoryNodeId = endingNodeData.inputs?.memory.split('.')[0].replace('{{', '')
                    const memoryNode = nodes.find((node) => node.data.id === memoryNodeId)
                    if (memoryNode) {
                        chatHistory = await replaceChatHistory(memoryNode, incomingInput, this.AppDataSource, databaseEntities, logger)
                    }
                }

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
                    chatHistory,
                    chatId,
                    chatflowid,
                    this.AppDataSource,
                    incomingInput?.overrideConfig,
                    this.cachePool,
                    isUpsert,
                    incomingInput.stopNodeId
                )
                if (isUpsert) return res.status(201).send('Successfully Upserted')

                const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
                if (!nodeToExecute) return res.status(404).send(`Node ${endingNodeId} not found`)

                if (incomingInput.overrideConfig)
                    nodeToExecute.data = replaceInputsWithConfig(nodeToExecute.data, incomingInput.overrideConfig)
                const reactFlowNodeData: INodeData = resolveVariables(
                    nodeToExecute.data,
                    reactFlowNodes,
                    incomingInput.question,
                    chatHistory
                )
                nodeToExecuteData = reactFlowNodeData

                const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))
                this.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
            }

            const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const nodeInstance = new nodeModule.nodeClass()

            logger.debug(`[server]: Running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

            let sessionId = undefined
            if (nodeToExecuteData.instance) sessionId = checkMemorySessionId(nodeToExecuteData.instance, chatId)

            const memoryNode = this.findMemoryLabel(nodes, edges)
            const memoryType = memoryNode?.data.label

            let chatHistory: IMessage[] | string = incomingInput.history
            if (memoryNode && !incomingInput.history && (incomingInput.chatId || incomingInput.overrideConfig?.sessionId)) {
                chatHistory = await replaceChatHistory(memoryNode, incomingInput, this.AppDataSource, databaseEntities, logger)
            }

            let result = isStreamValid
                ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatHistory,
                      socketIO,
                      socketIOClientId: incomingInput.socketIOClientId,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic,
                      chatId
                  })
                : await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                      chatHistory,
                      logger,
                      appDataSource: this.AppDataSource,
                      databaseEntities,
                      analytic: chatflow.analytic,
                      chatId
                  })

            result = typeof result === 'string' ? { text: result } : result

            // Retrieve threadId from assistant if exists
            if (typeof result === 'object' && result.assistant) {
                sessionId = result.assistant.threadId
            }

            const userMessage: Omit<IChatMessage, 'id'> = {
                role: 'userMessage',
                content: incomingInput.question,
                chatflowid,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId,
                createdDate: userMessageDateTime,
                user: req.user as User
            }
            await this.addChatMessage(userMessage, req.user as User)

            let resultText = ''
            if (result.text) resultText = result.text
            else if (result.json) resultText = '```json\n' + JSON.stringify(result.json, null, 2)
            else resultText = JSON.stringify(result, null, 2)

            const apiMessage: Omit<IChatMessage, 'id' | 'createdDate'> = {
                role: 'apiMessage',
                content: resultText,
                chatflowid,
                chatType: isInternal ? chatType.INTERNAL : chatType.EXTERNAL,
                chatId,
                memoryType,
                sessionId,
                user: req.user as User
            }
            if (result?.sourceDocuments) apiMessage.sourceDocuments = JSON.stringify(result.sourceDocuments)
            if (result?.usedTools) apiMessage.usedTools = JSON.stringify(result.usedTools)
            if (result?.fileAnnotations) apiMessage.fileAnnotations = JSON.stringify(result.fileAnnotations)
            await this.addChatMessage(apiMessage, req.user as User)

            logger.debug(`❌ [server]: Finished running ${nodeToExecuteData.label} (${nodeToExecuteData.id})`)

            // Only return ChatId when its Internal OR incoming input has ChatId, to avoid confusion when calling API
            if (incomingInput.chatId || isInternal) result.chatId = chatId

            return res.json(result)
        } catch (e: any) {
            logger.error('❌ [server]: Error:', e)
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
        const getAutomationNode = (nodes: any, automation: Automation) => {
            for (const node of nodes) {
                if (
                    node.data.category === 'Automations' &&
                    node.data.inputs.automationName === automation.name &&
                    node.data.inputs.automationUrl.split('/').pop() === automation.url
                ) {
                    return node.data
                }
            }
        }

        const getHandlerNodes = (nodes: any, edges: any, automationId: string) => {
            const handlerTargets = []
            for (const edge of edges) {
                if (edge.source === automationId) {
                    handlerTargets.push(edge.target)
                }
            }

            const handlerNodesData = []
            for (const node of nodes) {
                for (const target of handlerTargets) {
                    if (node.id === target) {
                        handlerNodesData.push(node.data)
                    }
                }
            }

            return handlerNodesData
        }

        const options = {
            appDataSource: this.AppDataSource,
            databaseEntities: databaseEntities
        }

        try {
            // first parse the information from the request
            const automationUrlId = req.params.id
            // get the coorelating automation
            const automation = await this.AppDataSource.getRepository(Automation).findOneBy({
                url: automationUrlId
            })
            // make sure the automation exists
            if (!automation) return res.status(404).send(`Automation ${automationUrlId} not found`)

            // only run the automation if it is enabled
            if (!automation.enabled) return res.status(404).send(`Automation ${automationUrlId} is not enabled`)

            // get chaflow associated with the automation
            const chatflowid = automation.chatflowid
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges

            // first make a node instance for the automation
            const automationNode = getAutomationNode(nodes, automation)
            // add the additionl information to the automation node
            automationNode.automationData = automation
            // create an instance of the automation node
            const automationInstanceFilePath = this.nodesPool.componentNodes[automationNode.name].filePath as string
            const automationModule = await import(automationInstanceFilePath)
            const automationInstance = new automationModule.nodeClass()

            // get instances for each of the handler nodes
            const handlerInstances = []
            const handlerNodes = getHandlerNodes(nodes, edges, automationNode.id)
            for (const handlerNode of handlerNodes) {
                const handlerInstanceFilePath = this.nodesPool.componentNodes[handlerNode.name].filePath as string
                const handlerModule = await import(handlerInstanceFilePath)
                const handlerInstance = new handlerModule.nodeClass()
                handlerInstances.push(handlerInstance)
            }

            // get some of the required information from the automation
            const definedQuestions = automationNode.inputs.definedQuestions || null

            // first run the trigger for the automation
            // the input from the trigger can be a list of inputs to run multiple times
            // or just a string to run one time
            // auxData should be of same length of triggerInputs and coorelat to each input
            let {
                status: triggerStatus,
                output: triggerInputs,
                auxData: auxData
            } = await automationInstance.runTrigger(automationNode, req.body, res, options)

            // if the trigger fails, return the error
            if (triggerStatus === false) {
                return res.status(404).send(triggerInputs)
            }

            // Ensure that input is always a list
            if (!Array.isArray(triggerInputs)) {
                triggerInputs = [triggerInputs]
            }

            // Ensure that auxData is always a list
            if (!Array.isArray(auxData)) {
                auxData = [auxData]
            }

            for (let i = 0; i < triggerInputs.length; i++) {
                let input = triggerInputs[i]
                let aux = auxData[i]

                // next, handle the prediction with the chatflow
                let incomingInput: IncomingInput
                let inputs = []
                if (definedQuestions) {
                    // if there is a list of predefined questions, loop through them
                    // and add them to the inputs that will be asked
                    for (const question of definedQuestions.split('-')) {
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
                    if (input.question === '' || input.question === null) {
                        continue
                    }

                    let predResult: any = {}

                    // create a mock request objectf
                    const tmpReq = {
                        params: { id: chatflowid },
                        body: input
                    } as Partial<Request>

                    // Create a mock response object
                    const tmpRes = {
                        send: function (response) {
                            predResult.data = response
                            return this // Enable chaining by returning the mock itself
                        },
                        status: function (statusCode) {
                            predResult.status = statusCode
                            return this // Enable chaining by returning the mock itself
                        },
                        json: function (response) {
                            predResult.status = 200 // default status
                            predResult.data = response
                            return this // Enable chaining by returning the mock itself
                        }
                        // ... other methods as needed
                    } as Partial<Response>

                    await this.buildChatflow(tmpReq as Request, tmpRes as Response, socketIO, isInternal, true)

                    const result = predResult.data.text ? predResult.data.text : predResult.data
                    const status = predResult.status ? predResult.status : 404

                    if (status !== 200) {
                        return res.status(status as any).send(result)
                    } else {
                        // combine the outputs
                        if (definedQuestions) {
                            combinedOutupts = combinedOutupts + '\n\n' + input.question + ':' + '\n' + result
                        } else {
                            combinedOutupts = combinedOutupts + result
                        }
                    }
                }

                // use the default handler for the automation
                try {
                    const { status: handlerStatus, output: handlerOutput } = await automationInstance.runHandler(
                        automationNode,
                        combinedOutupts,
                        req.body,
                        res,
                        options,
                        aux
                    )
                } catch (e) {
                    logger.error('❌ [server]: Error:', e)
                    return res.status(404).send('Failed to run handler function')
                }

                // if additional handlers are attached, run them also
                for (let i = 0; i < handlerInstances.length; i++) {
                    try {
                        const { status: handlerStatus, output: handlerOutput } = await handlerInstances[i].runHandler(
                            handlerNodes[i],
                            combinedOutupts,
                            options
                        )
                    } catch (e) {
                        logger.error('❌ [server]: Error:', e)
                        return res.status(404).send('Failed to run handler function')
                    }
                }
            }
        } catch (e: any) {
            logger.error('❌ [server]: Error:', e)
            return res.status(500).send(e.message)
        }
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            await Promise.all(removePromises)
        } catch (e) {
            logger.error(`❌[server]: AmbientWare Server shut down error: ${e}`)
        }
    }
}

/**
 * Get first chat message id
 * @param {string} chatflowid
 * @returns {string}
 */
export async function getChatId(chatflowid: string): Promise<string> {
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
        logger.info(`⚡️ [server]: AmbientWare Server is listening at ${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
