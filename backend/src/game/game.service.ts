import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';

@Injectable()
export class GameService {
  private games: Map<string, Chess> = new Map();

  createGame(): string {
    const gameId = Math.random().toString(36).substring(2, 8);
    this.games.set(gameId, new Chess()); // Criar novo jogo
    return gameId;
  }

  getGame(gameId: string): Chess | null {
    return this.games.get(gameId) || null;
  }

  makeMove(gameId: string, move: any): { success: boolean; fen?: string; message?: string } {
    const game = this.games.get(gameId);
    if (!game) return { success: false, message: 'Game not found' };
    console.log(`🎲 ${gameId} - ${JSON.stringify(game)}`);

    try {
      const result = game.move(move);
      if (!result) return { success: false, message: 'Invalid move' };

      return { success: true, fen: game.fen() };
    } catch (error) {
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
