/* eslint-disable */
import { Entity, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToOne, 
   } from 'typeorm'
import { IAutomation } from '../../Interface'
import { User } from './User'; // import the User entity
import { ChatFlow } from './ChatFlow'; // import the ChatFlow entity
import { Trigger } from './Trigger'; // import the Trigger entity
import { AutomationHandler } from './AutomationHandler'; // import the AutomationHandler entity

trigger: Trigger
automationhandler: AutomationHandler

@Entity()
export class Automation implements IAutomation {
@PrimaryGeneratedColumn('uuid')
id: string

@Column()
userId: string

@Column()
chatflowid: string

@Column()
triggerid: string

@Column()
handlerid: string

@Column({ nullable: true })
interval: string

@Column({ nullable: true })
url: string

@Column()
name: string

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

@ManyToOne(type => User, user => user.tools)
user: User;
}
