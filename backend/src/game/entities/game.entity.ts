import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  board: string[][]; // Agora armazenado corretamente como JSONB

  @Column({ type: 'char', length: 1, default: 'w' })
  turn: string; // 'w' para branco, 'b' para preto

  @Column({ type: 'varchar', nullable: true })
  winner: string | null;
}
