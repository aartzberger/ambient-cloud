/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, ManyToMany, OneToMany } from 'typeorm'
import { IAssistant } from '../../Interface'
import { Collection } from './Collection'
import { User } from './User' // import the User entity

@Entity()
export class Assistant implements IAssistant {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    details: string

    @Column()
    credential: string

    @ManyToOne((type) => Collection, (collection) => collection.assistants, {
        cascade: true,
    })
    collection?: Collection

    @Column({ nullable: true })
    iconSrc?: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne((type) => User, (user) => user.assistants)
    user: User
}
