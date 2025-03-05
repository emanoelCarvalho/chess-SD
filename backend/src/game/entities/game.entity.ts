import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  fen: string;

  @Column('text')
  pgn: string;

  @Column('text', { nullable: true })
  winner: string | null;
}