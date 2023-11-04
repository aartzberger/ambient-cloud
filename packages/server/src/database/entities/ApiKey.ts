/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'
import { IApiKey } from '../../Interface'
import { User } from './User' // import the User entity

@Entity()
export class ApiKey implements IApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    keyName: string

    @Column()
    apiKey: string

    @Column()
    apiSecret: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne((type) => User, (user) => user.tools)
    user: User
}
