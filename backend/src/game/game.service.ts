import { Injectable, Logger } from '@nestjs/common';
import { Chess } from 'chess.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();
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
      moves: chess.pgn(),
      winner: null,
    });

    await this.gameRepository.save(newGame);
    return gameId;
  }

  async getGame(gameId: string): Promise<Game | null> {
    let game = this.games.get(gameId);
    if (!game) {
      const storedGame = await this.gameRepository.findOne({ where: { id: gameId } });
      if (!storedGame) return null;
      game = new Chess(storedGame.fen);
      this.games.set(gameId, game);
    }
    return this.gameRepository.findOne({ where: { id: gameId } });
  }

  async makeMove(gameId: string, move: string) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Jogo não encontrado' };
    
    console.log("Movimentos permitidos:", game.moves()); 
    const moveResult = game.move({from: move.slice(0, 2), to: move.slice(2)});
    if (!moveResult) return { success: false, message: 'Movimento inválido' };

    await this.gameRepository.update(gameId, {
      fen: game.fen(),
      moves: game.pgn(),
    });
    
    return { success: true, fen: game.fen() };
  }

  async checkGameOver(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Jogo não encontrado' };

    if (game.isGameOver()) {
      let winner = 'draw';
      if (game.isCheckmate()) {
        winner = game.turn() === 'w' ? 'black' : 'white';
      }
      await this.gameRepository.update(gameId, { winner });
      return { success: true, winner, message: game.isCheckmate() ? 'Xeque-mate!' : 'Empate' };
    }
    return { success: false, message: 'Jogo ainda em andamento' };
  }
}
