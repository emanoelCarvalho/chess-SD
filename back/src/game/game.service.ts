import { Injectable } from '@nestjs/common';
import { Chess, ChessInstance } from 'chess.js';

@Injectable()
export class GameService {
  private games: Map<string, ChessInstance> = new Map();

  createGame(): string {
    const gameId = Math.random().toString(36).substring(2, 8);
    this.games.set(gameId, new Chess());
    return gameId;
  }

  joinGame(gameId: string, clientId: string): ChessInstance {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  }

  makeMove(gameId: string, move: any): ChessInstance | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    try {
      game.move(move);
      return game;
    } catch (error) {
      return null;
    }
  }
}