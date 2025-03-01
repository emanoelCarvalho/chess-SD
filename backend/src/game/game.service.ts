import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();

  createGame(): string {
    const gameId = Math.random().toString(36).substring(2, 8);
    this.games.set(gameId, new Chess());
    return gameId;
  }

  getGame(gameId: string): Chess | null {
    return this.games.get(gameId) || null;
  }

  makeMove(gameId: string, move: any): { success: boolean; fen?: string; message?: string } {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Game not found' };
  
    // Verifica se o jogo já terminou
    if (game.isGameOver()) {
      return { success: false, message: 'Game is already over' };
    }
  
    // Converte o movimento para string UCI
    let moveString: string;
    if (typeof move === 'object' && move.from && move.to) {
      moveString = `${move.from}${move.to}`; // Converte para formato UCI (ex: "e2e4")
    } else if (typeof move === 'string') {
      moveString = move; // Assume que já está no formato UCI ou SAN
    } else {
      return { success: false, message: 'Invalid move format' };
    }
  
    console.log(`🎲 ${gameId} - Tentando mover: ${moveString}`);
  
    try {
      const result = game.move(moveString);
      if (!result) {
        console.log(`❌ Movimento inválido: ${moveString}`);
        return { success: false, message: 'Invalid move' };
      }
  
      console.log(`✅ Movimento realizado: ${JSON.stringify(result)}`);
      return { success: true, fen: game.fen() };
    } catch (error) {
      console.error(`❌ Erro ao realizar movimento: ${error.message}`);
      return { success: false, message: 'Invalid move' };
    }
  }

  checkGameOver(gameId: string): string | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (game.isCheckmate()) {
      return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    } else if (game.isDraw()) {
      return 'Draw!';
    }

    return null;
  }
}
