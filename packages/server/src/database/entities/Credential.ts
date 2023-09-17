/* eslint-disable */
import { Entity, 
         Column, 
         PrimaryGeneratedColumn, 
         Index, 
         CreateDateColumn, 
         UpdateDateColumn,
         ManyToOne, 
         JoinColumn
         } from 'typeorm'
import { ICredential } from '../../Interface'
import { User } from './User'; // import the User entity

@Entity()
export class Credential implements ICredential {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    userId: string

    @Column()
    name: string

    @Column()
    credentialName: string

    @Column({ type: 'text' })
    encryptedData: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @ManyToOne(type => User, user => user.credentials)
    user: User;
}
