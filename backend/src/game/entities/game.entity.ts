import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  fen: string;

  @Column({ type: 'jsonb', nullable: true })
  moves: string

  @Column({ type: 'varchar', nullable: true })
  winner: string;

  @CreateDateColumn()
  createdAt: Date;
}
