/* eslint-disable */
import { Entity, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    PrimaryGeneratedColumn,
    OneToMany,
    ManyToMany,
    ManyToOne
   } from 'typeorm'
import { ITrigger } from '../../Interface'
import { Automation } from './Automation'; // import the User entity
import { User } from './User'; // import the User entity

@Entity()
export class Trigger implements ITrigger {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    userId: string

    @Column()
    name: string

    @Column()
    type: string

    @Column({ type: 'text' })
    description: string

    @Column()
    color: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ nullable: true, type: 'text' })
    schema?: string

    @Column({ nullable: true, type: 'text' })
    func?: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne(type => User, user => user.triggers)
    user: User;
    
}