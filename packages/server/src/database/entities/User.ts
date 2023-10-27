/* eslint-disable */
import { Entity, Column, OneToMany, PrimaryColumn, ManyToMany } from 'typeorm'
import { IUser } from '../../Interface'
import { ChatFlow } from './ChatFlow' // import the ChatFlow entity
import { ChatMessage } from './ChatMessage' // import the ChatFlow entity
import { Credential } from './Credential' // import the ChatFlow entity
import { Tool } from './Tool' // import the ChatFlow entity
import { RemoteDb } from './RemoteDb' // import the ChatFlow entity
import { Trigger } from './Trigger'
import { AutomationHandler } from './AutomationHandler'
import { Automation } from './Automation'

@Entity()
export class User implements IUser {
    @PrimaryColumn()
    id: string

    @Column()
    name: string

    @Column()
    email: string

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

    @OneToMany((type) => Tool, (tool) => tool.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    tools: Tool[]

    @OneToMany((type) => RemoteDb, (remotedb) => remotedb.user, {
        cascade: true // This will allow you to save tools when saving a user
    })
    remotedb: RemoteDb[]

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
}
