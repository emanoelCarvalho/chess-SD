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

  joinGame(gameId: string): Chess | null {
    return this.games.get(gameId) || null;
  }

  makeMove(gameId: string, move: any): Chess | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    // Valida se o movimento é permitido
    const validMoves = game.moves();
    if (!validMoves.includes(move.san)) {
      return null;
    }

    game.move(move);
    return game;
  }
}
