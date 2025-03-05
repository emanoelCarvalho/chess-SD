import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async createGame(): Promise<string> {
    const gameId = uuidv4();
    const chess = new Chess(); // Inicializa um novo jogo de xadrez
    this.games.set(gameId, chess);

    // Cria um novo registro no banco de dados com o estado inicial do jogo
    const newGame = this.gameRepository.create({
      id: gameId,
      fen: chess.fen(), // Estado inicial do jogo
      moves: '', // Inicializa a lista de movimentos vazia
    });

    await this.gameRepository.save(newGame);
    return gameId;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    return game || null;
  }

  async makeMove(gameId: string, move: string) {
    if (!this.games.has(gameId)) {
      const storedGame = await this.getGame(gameId);
      if (!storedGame) {
        return { success: false, message: 'Jogo não encontrado' };
      }
      const chess = new Chess(storedGame.fen);
      this.games.set(gameId, chess);
    }
  
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, message: 'Jogo não encontrado' };
    }
  
    // Verifica se o movimento é válido
    const validMoves = game.moves();
    const isValidMove = validMoves.some((m) => m === move);
  
    if (!isValidMove) {
      return { success: false, message: 'Movimento inválido' };
    }
  
    // Aplica o movimento
    const result = game.move(move);
    if (result) {
      // Atualiza o estado do jogo no banco de dados
      await this.gameRepository.update(gameId, {
        fen: game.fen(),
        moves: game.pgn(), // Salva a notação PGN dos movimentos como uma string
      });
  
      return { success: true, fen: game.fen() };
    }
  
    return { success: false, message: 'Movimento inválido' };
  }
  async checkGameOver(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Jogo não encontrado' };

    if (game.isGameOver()) {
      let winner = 'draw';
      if (game.isCheckmate()) {
        winner = game.turn() === 'w' ? 'black' : 'white';
      }
      await this.saveWinner(gameId, winner);
      return { success: true, winner, message: game.isCheckmate() ? 'Xeque-mate!' : 'Empate' };
    }
    return { success: false, message: 'Jogo ainda em andamento' };
  }

  private async saveWinner(gameId: string, winner: string) {
    await this.gameRepository.update(gameId, { winner });
  }
}