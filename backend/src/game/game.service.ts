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
  private moveLocks: Map<string, boolean> = new Map();


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
    // Busca do banco de dados apenas se não estiver em memória
    if (!this.games.has(gameId)) {
      const storedGame = await this.gameRepository.findOne({ where: { id: gameId } });
      if (!storedGame) return null;
      this.games.set(gameId, new Chess(storedGame.fen));
    }
    return this.gameRepository.findOne({ where: { id: gameId } });
  }

  async makeMove(gameId: string, move: string) {
    // Verifica se já há um movimento em andamento para este jogo
    if (this.moveLocks.get(gameId)) {
      this.logger.warn(`Movimento já em progresso para o jogo: ${gameId}`);
      return { success: false, message: 'Aguarde o movimento anterior' };
    }
  
    try {
      this.moveLocks.set(gameId, true);
      
      const game = this.games.get(gameId);
      if (!game) return { success: false, message: 'Jogo não encontrado' };
  
      // Valida formato do movimento
      if (!/^[a-h][1-8][a-h][1-8]$/.test(move)) {
        return { success: false, message: 'Formato de movimento inválido' };
      }
  
      // Executa movimento
      const moveResult = game.move({
        from: move.substring(0, 2),
        to: move.substring(2, 4),
        promotion: 'q' // Promoção padrão para dama
      }, { strict: false });
  
      if (!moveResult) return { success: false, message: 'Movimento inválido' };
  
      // Atualiza banco de dados
      await this.gameRepository.update(gameId, {
        fen: game.fen(),
        pgn: game.pgn()
      });
  
      return { success: true, fen: game.fen() };
    } catch (error) {
      this.logger.error(`Erro no movimento: ${error.message}`);
      return { success: false, message: 'Erro interno' };
    } finally {
      this.moveLocks.set(gameId, false);
    }
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
      return { success: true, winner };
    }
    return { success: false };
  }
}