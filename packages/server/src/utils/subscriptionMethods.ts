import Stripe from 'stripe'
import logger from './logger'
import { User } from '../database/entities/User'
import { Subscription } from '../database/entities/Subscription'
import { DataSource } from 'typeorm'
import { v4 } from 'uuid'
const bcrypt = require('bcrypt')

const stripSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// ----------------------------
// interfaces
// ----------------------------

interface ILoginStatus {
    code: number
    error?: string
    user?: User
}

interface ISubscriptionEntities {
    name: string
    price: string
    priceId: string
    description: string
    recurring: string
    current: boolean
    features: any
    metadata: any
}

// ----------------------------
// Methods for login and creating users
// ----------------------------

// function for loging in a user or creating a new one
export const loginOrCreateUser = async (
    signup: boolean,
    profile: any,
    subscriptionMethod: StripeSubscription,
    dataSource: DataSource
): Promise<ILoginStatus> => {
    const checkObj = !profile.oauthType ? { email: profile.email } : { oauthId: profile.id, oauthType: profile.oauthType }
    const existingUser = await dataSource.getRepository(User).findOneBy(checkObj)

    if (
        (existingUser && !profile.oauthType && existingUser?.oauthType) ||
        (existingUser && profile.oauthType && !existingUser?.oauthType)
    ) {
        // User already exists with a different sign in method than the one used
        return { code: 409, error: 'User already exists.' }
    } else if (existingUser && profile.password && !existingUser?.oauthType) {
        // here we check if a user exists using username/password
        const isMatch = await bcrypt.compare(profile.password, existingUser.password)
        if (isMatch) {
            // Passwords match... good login
            return { code: 200, user: existingUser }
        } else {
            // username and password do not match
            // TODO CMAN - better error handling for wrong password
            return { code: 401, error: 'Login failed. Please check your email and password.' }
        }
    } else if (existingUser && profile.oauthType && existingUser?.oauthType) {
        // here we return a user that already exists with oauth
        return { code: 200, user: existingUser }
    } else if (!signup && !existingUser) {
        // tried to login but user does not exist
        return { code: 404, error: 'User does not exist. Please sign up.' }
    }

    let newUser: User
    if (!profile.oauthType) {
        // this code is for none oauth2 methods... email/password
        // do a standard login process with username and password

        // create hashed password for the user. dont store the actual thing
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(profile.password, saltRounds)

        newUser = new User()
        Object.assign(newUser, {
            name: profile.name,
            email: profile.email,
            password: hashedPassword
        })
    } else {
        // this code is for oauth2 methods... google, facebook, etc.
        newUser = new User()
        Object.assign(newUser, {
            oauthId: profile.id,
            name: profile.name,
            email: profile.email,
            oauthType: profile.oauthType
        })
    }

    // subscription and customerid is checked/added here
    // if no subscription, free tier is added for new customer.
    const subscribedUser = await subscriptionMethod.syncCustomer(newUser, dataSource)

    return { code: 200, user: subscribedUser }
}

// ----------------------------
// Methods for subscribing to a plan
// ----------------------------

function formatCentsToDollars(cents: number, currency = 'USD') {
    const dollars = cents / 100
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(dollars)
}

export class StripeSubscription {
    stripe: Stripe
    url: string

    constructor() {
        if (!stripSecretKey || !stripeWebhookSecret) {
            throw new Error('Stripe secret key and webhook secret key are required')
        }
        this.stripe = new Stripe(stripSecretKey)
        this.url = process.env.DEPLOYED_URL || 'https://app.ambientware.co'
    }

    async startFreeSubscription(customer: any, dataSource: DataSource) {
        const products = await this.getAllProducts()

        const freeProduct = products?.find((product) => product.name.toLowerCase() === 'free'.toLowerCase())

        const subObj = {
            customer: customer,
            items: [
                {
                    price: freeProduct?.default_price as string
                }
            ]
        }

        const subscribe = await this.stripe.subscriptions.create(subObj)
        this.updateSubscription(subscribe, dataSource)

        return subscribe
    }

    async syncCustomer(user: User, dataSource: DataSource) {
        try {
            // check to see if the customer already exists in stripe
            const customerQuery = await this.stripe.customers.search({
                query: `email:'${user.email}' AND metadata['oauthId']:'${user.oauthId}' AND metadata['oauthType']:'${user.oauthType}'`
            })

            let customer
            let subscription
            if (customerQuery.data.length > 0) {
                // if it does then return the customer
                customer = customerQuery.data[0]
                // check if the customer has a subscription
                subscription = await this.stripe.subscriptions.list({
                    customer: customerQuery.data[0].id
                })
            } else {
                // if it does not then create the customer in stripe
                customer = await this.stripe.customers.create(
                    {
                        email: user.email,
                        name: user.name,
                        metadata: {
                            oauthId: user.oauthId || null,
                            oauthType: user.oauthType || null
                        }
                    },
                    {
                        // this will make sure we do not create duplicate requests
                        idempotencyKey: v4()
                    }
                )
                subscription = null
            }

            user.customerId = customer.id

            const syncedUser = await dataSource.getRepository(User).save(user)

            // if the customer has a subscription then update it
            // if not then create a free subscription
            subscription
                ? await this.updateSubscription(subscription.data[0], dataSource)
                : this.startFreeSubscription(customer.id, dataSource)

            return syncedUser
        } catch (error) {
            logger.error('Error creating Stripe customer:', error)
            throw error
        }
    }

    async createSession(user: User, priceId: string) {
        try {
            const session = await this.stripe.checkout.sessions.create({
                billing_address_collection: 'auto',
                line_items: [
                    {
                        price: priceId,
                        // For metered billing, do not pass quantity
                        quantity: 1
                    }
                ],
                mode: 'subscription',
                success_url: `${this.url}/api/v1/subscriptions/status/?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${this.url}/api/v1/subscriptions/status/?canceled=true`,
                customer: user.customerId // make sure the stripe customer is linked with Ambient user
            })

            return session
        } catch (error) {
            logger.error(error)
            return null
        }
    }

    async getCustomerPortal(user: User) {
        try {
            // This is the url to which the customer will be redirected when they are done
            // managing their billing with the portal.
            const returnUrl = `${this.url}/chatflows`

            const portalSession = await this.stripe.billingPortal.sessions.create({
                customer: user.customerId,
                return_url: returnUrl
            })

            return portalSession
        } catch (error) {
            logger.error(error)
            return null
        }
    }

    async getSubscriptionOptions() {
        const subscriptionOptions: ISubscriptionEntities[] = []

        const products = await this.getAllProducts()

        if (!products) {
            return null
        }

        for (const product of products) {
            const price = await this.getPrice(product.default_price as string)

            if (!price) {
                continue
            }

            const subscription: ISubscriptionEntities = {
                name: product.name,
                price: formatCentsToDollars(Number(price.unit_amount_decimal), price.currency.toUpperCase()),
                priceId: price.id,
                description: product.description || '',
                recurring: price.recurring?.interval || '',
                features: product.features,
                current: false,
                metadata: product.metadata
            }

            subscriptionOptions.push(subscription)
        }

        // Sort by price
        subscriptionOptions.sort((a: ISubscriptionEntities, b: ISubscriptionEntities) => {
            // Remove the dollar sign and convert to a float for comparison
            const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''))
            const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''))

            return priceA - priceB // For ascending order
            // Use `return priceB - priceA` for descending order
        })

        return subscriptionOptions
    }

    async getAllProducts(activeOnly = true) {
        try {
            const products = await this.stripe.products.list({ active: activeOnly })
            return products.data
        } catch (error) {
            logger.error(error)
        }
    }

    async getProduct(productId: string) {
        try {
            const product = await this.stripe.products.retrieve(productId)
            return product
        } catch (error) {
            logger.error(error)
        }
    }

    async getPrice(priceId: string) {
        try {
            const price = await this.stripe.prices.retrieve(priceId)
            return price
        } catch (error) {
            logger.error(error)
        }
    }

    async updateSubscription(subscriptionData: any, dataSource: DataSource) {
        try {
            const sub = await dataSource.getRepository(Subscription).findOneBy({
                subscriptionId: subscriptionData.id
            })

            const subObj = {
                status: subscriptionData?.status,
                subscriptionId: subscriptionData?.id,
                details: subscriptionData,
                product: await this.getProduct((subscriptionData as any)?.plan?.product as string)
            }

            // if we dont have one, make a new one
            if (!sub) {
                const user = await dataSource.getRepository(User).findOneBy({
                    customerId: subscriptionData.customer
                })

                const newSub = new Subscription()
                Object.assign(newSub, subObj)
                newSub.user = user as User

                const sub = dataSource.getRepository(Subscription).create(newSub)
                const results = await dataSource.getRepository(Subscription).save(sub)

                return results
            }

            const updateSub = new Subscription()
            Object.assign(updateSub, subObj)

            dataSource.getRepository(Subscription).merge(sub, updateSub)
            const result = await dataSource.getRepository(Subscription).save(sub)

            return result
        } catch (error) {
            logger.error('[Server]: Error updating Stripe subscription:', error)
            return false
        }
    }

    async deleteSubscription(subscriptionId: string, dataSource: DataSource) {
        try {
            const sub = await dataSource.getRepository(Subscription).findOneBy({
                subscriptionId: subscriptionId
            })

            const result = await dataSource.getRepository(Subscription).delete({ id: sub?.id })
            return result
        } catch (error) {
            logger.error('[Server]: Error creating Stripe subscription:', error)
            return false
        }
    }

    async handleEvent(event: any, dataSource: DataSource) {
        // Handle the event
        let status
        switch (event.type) {
            case 'customer.subscription.deleted':
                const subscriptionDeleted = event.data.object
                status = await this.deleteSubscription(subscriptionDeleted.id, dataSource)
                logger.info(`[Server]: Subscription deleted ${subscriptionDeleted.id}`)
                return status
            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object
                status = await this.updateSubscription(subscriptionUpdated, dataSource)
                logger.info(`[Server]: Subscription updated ${subscriptionUpdated.id}`)
                return status
            // ... handle other event types
            default:
                logger.info(`[Server]: Unhandled stripe event type ${event.type}`)
                return null
        }
    }
}
