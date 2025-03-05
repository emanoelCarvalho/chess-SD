import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fen: string;

  @Column({ type: 'text', nullable: true }) // Armazena a notação PGN como string
  moves: string;

  @Column({ nullable: true })
  winner: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}