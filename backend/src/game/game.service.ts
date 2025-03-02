import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { Chess } from 'chess.js';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async createGame(): Promise<string> {
    try {
      const game = new Chess();
      const newGame = this.gameRepository.create({ fen: game.fen(), moves: [] });
      await this.gameRepository.save(newGame);
      this.games.set(newGame.id, game);
      this.logger.log(`🎲 Novo jogo criado: ${newGame.id}`);
      return newGame.id;
    } catch (error) {
      this.logger.error(`Erro ao criar jogo: ${error.message}`);
      throw new Error('Erro ao criar jogo');
    }
  }

  async makeMove(gameId: string, move: { from: string; to: string }) {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Jogo não encontrado');
      }

      const moveResult = game.move(move);
      if (!moveResult) {
        throw new Error('Movimento inválido');
      }

      await this.gameRepository.update(gameId, {
        fen: game.fen(),
        moves: () => `array_append(moves, '${JSON.stringify(move)}')`,
      });

      return { success: true, fen: game.fen() };
    } catch (error) {
      this.logger.error(`Erro ao realizar movimento: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async checkGameOver(gameId: string) {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Jogo não encontrado');
      }

      if (game.isGameOver()) {
        const gameEntity = await this.gameRepository.findOne({
          where: { id: gameId },
        });
        const winner = game.isCheckmate() ? game.turn() : 'draw';
        await this.gameRepository.update(gameId, { winner });
        return { success: true, winner };
      }

      return { success: false, message: 'Jogo não terminou' };
    } catch (error) {
      this.logger.error(`Erro ao verificar fim do jogo: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async getGame(gameId: string): Promise<Chess | null> {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error('Jogo não encontrado');
      }
      return game;
    } catch (error) {
      this.logger.error(`Erro ao buscar jogo: ${error.message}`);
      return null;
    }
  }
}