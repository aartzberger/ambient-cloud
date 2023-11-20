/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, OneToOne } from 'typeorm'
import { ISubscription } from '../../Interface'
import { User } from './User' // import the User entity

@Entity()
export class Subscription implements ISubscription {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    status: string

    @Column()
    subscriptionId: string

    @Column({ type: 'json', nullable: true })
    details: any;

    @Column({ type: 'json', nullable: true })
    product: any;

    @Column({ type: 'json', nullable: true })
    usage: any; // this will be json of what the user had access to and how much they used

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @OneToOne(() => User, (user) => user.subscription)
    user: User
}
