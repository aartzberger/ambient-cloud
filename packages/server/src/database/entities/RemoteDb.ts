/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'
import { IRemoteDb } from '../../Interface'
import { User } from './User' // import the User entity

@Entity()
export class RemoteDb implements IRemoteDb {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    url: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne((type) => User, (user) => user.remotedb)
    user: User
}
