import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Game {
  @PrimaryColumn()
  id: string;

  @Column('text')
  fen: string;

  @Column('text')
  pgn: string;

  @Column('text', { nullable: true })
  winner: string | null;
}