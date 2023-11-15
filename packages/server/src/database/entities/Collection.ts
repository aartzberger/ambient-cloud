/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany } from 'typeorm'
import { ICollection } from '../../Interface'
import { User } from './User' // import the User entity
import { Assistant } from './Assistant'

@Entity()
export class Collection implements ICollection {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    type: string

    @Column()
    files?: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @OneToMany((type) => Assistant, (assistant) => assistant.collection)
    assistants?: Assistant[]

    @ManyToOne((type) => User, (user) => user.collections)
    user: User
}
