/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'
import { IAutomation } from '../../Interface'
import { User } from './User' // import the User entity


@Entity()
export class Automation implements IAutomation {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    enabled: boolean

    @Column()
    chatflowid: string

    @Column({ nullable: true })
    interval?: string

    @Column()
    timeZone: string

    @Column()
    url: string

    @Column()
    cache?: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne((type) => User, (user) => user.tools)
    user: User
}
