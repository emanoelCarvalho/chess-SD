import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  fen: string; // Última posição do tabuleiro no formato FEN

  @Column({ type: 'jsonb', nullable: true })
  moves: { from: string; to: string }[]; // Histórico de jogadas

  @Column({ type: 'varchar', nullable: true })
  winner: string; // "w" para brancas, "b" para pretas ou "draw" para empate

  @CreateDateColumn()
  createdAt: Date;
}
