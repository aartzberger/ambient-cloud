/* eslint-disable */
import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm'
import { IUser } from '../../Interface'
import { ChatFlow } from './ChatFlow'; // import the ChatFlow entity
import { ChatMessage } from './ChatMessage'; // import the ChatFlow entity
import { Credential } from './Credential'; // import the ChatFlow entity
import { Tool } from './Tool'; // import the ChatFlow entity



@Entity()
export class User implements IUser {
    @PrimaryColumn()
    id: string

    @Column()
    name: string

    @Column()
    email: string

    @OneToMany(type => ChatFlow, chatflow => chatflow.user, {
        cascade: true, // This will allow you to save chatflows when saving a user
    })
    chatflows: ChatFlow[];

    @OneToMany(type => ChatMessage, chatmessage => chatmessage.user, {
        cascade: true, // This will allow you to save chat messages when saving a user
    })
    chatmessages: ChatMessage[];

    @OneToMany(type => Credential, credential => credential.user, {
        cascade: true, // This will allow you to save credentials when saving a user
    })
    credentials: Credential[];

    @OneToMany(type => Tool, tool => tool.user, {
        cascade: true, // This will allow you to save tools when saving a user
    })
    tools: Tool[];
}
