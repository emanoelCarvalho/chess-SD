
import { Injectable, Logger } from '@nestjs/common';
import { Chess } from 'chess.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();
  private mutexes: Map<string, Mutex> = new Map();
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async createGame(): Promise<string> {
    const gameId = uuidv4();
    const chess = new Chess();
    this.games.set(gameId, chess);

    const newGame = this.gameRepository.create({
      id: gameId,
      fen: chess.fen(),
      pgn: chess.pgn(),
      winner: null,
    });
    await this.gameRepository.save(newGame);
    return gameId;
  }

  async getGame(gameId: string): Promise<Game | null> {
    if (!this.games.has(gameId)) {
      const storedGame = await this.gameRepository.findOne({ where: { id: gameId } });
      if (!storedGame) return null;
      this.games.set(gameId, new Chess(storedGame.fen));
      return storedGame;
    }
    return this.gameRepository.findOne({ where: { id: gameId } });
  }

  async makeMove(gameId: string, move: string): Promise<{ success: boolean; message?: string; fen?: string }> {
    const mutex = this.mutexes.get(gameId) || new Mutex();
    this.mutexes.set(gameId, mutex);
    const release = await mutex.acquire();
    try {
      let game = this.games.get(gameId);
      if (!game) {
        const storedGame = await this.gameRepository.findOne({ where: { id: gameId } });
        if (!storedGame) return { success: false, message: 'Game not found' };
        game = new Chess(storedGame.fen);
        this.games.set(gameId, game);
      }
      const moveResult = game.move(move);
      if (!moveResult) return { success: false, message: 'Invalid move' };

      const updateData: Partial<Game> = {
        fen: game.fen(),
        pgn: game.pgn(),
      };
      if (game.isGameOver()) {
        updateData.winner = game.turn() === 'w' ? 'black' : 'white';
      }

      await this.gameRepository.update(gameId, updateData);
      return { success: true, fen: game.fen() };
    } finally {
      release();
    }
  }
}
