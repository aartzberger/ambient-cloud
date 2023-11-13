/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { IChatMessage, MessageType } from '../../Interface'
import { User } from './User' // import the User entity

@Entity()
export class ChatMessage implements IChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    role: MessageType

    @Index()
    @Column()
    chatflowid: string

    @Column({ type: 'text' })
    content: string

    @Column({ nullable: true, type: 'text' })
    sourceDocuments?: string

    @Column({ nullable: true, type: 'text' })
    usedTools?: string

    @Column()
    chatType: string

    @Column()
    chatId: string

    @Column({ nullable: true })
    memoryType?: string

    @Column({ nullable: true })
    sessionId?: string

    @CreateDateColumn()
    createdDate: Date

    @ManyToOne((type) => User, (user) => user.chatmessages)
    user: User
}
