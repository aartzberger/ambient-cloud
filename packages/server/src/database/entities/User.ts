/* eslint-disable */
import { Entity, Column, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm'
import { IUser } from '../../Interface'
import { Subscription } from './Subscription'
import { ChatFlow } from './ChatFlow'
import { ChatMessage } from './ChatMessage'
import { Credential } from './Credential'
import { ApiKey } from './ApiKey'
import { Tool } from './Tool'
import { RemoteDb } from './RemoteDb'
import { Trigger } from './Trigger'
import { AutomationHandler } from './AutomationHandler'
import { Automation } from './Automation'
import { Assistant } from './Assistant'
import { Collection } from './Collection'

@Entity()
export class User implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    customerId: string

    @Column()
    email: string

    @Column({ nullable: true })
    password?: string

    @Column({ nullable: true })
    oauthType?: string

    @Column({ nullable: true })
    oauthId?: string

    @OneToOne((type) => Subscription, (subscirption) => subscirption.user, {
        cascade: true // This will allow you to save chatflows when saving a user
    })
    @JoinColumn()
    subscription: Subscription

    @OneToMany((type) => ChatFlow, (chatflow) => chatflow.user, {
        cascade: true // This will allow you to save chatflows when saving a user
    })
    chatflows: ChatFlow[]

    @OneToMany((type) => ChatMessage, (chatmessage) => chatmessage.user, {
        cascade: true // This will allow you to save chat messages when saving a user
    })
    chatmessages: ChatMessage[]

    @OneToMany((type) => Credential, (credential) => credential.user, {
        cascade: true // This will allow you to save credentials when saving a user
    })
    credentials: Credential[]

    @OneToMany((type) => ApiKey, (apiKey) => apiKey.user, {
        cascade: true // This will allow you to save credentials when saving a user
    })
    apiKeys: ApiKey[]

    @OneToMany((type) => Tool, (tool) => tool.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    tools: Tool[]

    @OneToMany((type) => RemoteDb, (remotedb) => remotedb.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    remotedb: RemoteDb[]

    @OneToMany((type) => Collection, (collection) => collection.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    collections: Collection[]

    @OneToMany((type) => Automation, (automation) => automation.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    automations: Automation[]

    @OneToMany((type) => Trigger, (trigger) => trigger.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    triggers: Trigger[]

    @OneToMany((type) => AutomationHandler, (handler) => handler.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    automationhandlers: AutomationHandler[]

    @OneToMany((type) => Assistant, (assistant) => assistant.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    assistants: Assistant[]
}
