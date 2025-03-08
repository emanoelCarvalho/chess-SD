import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  private initialBoard(): string[][] {
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ];
  }

  async createGame(): Promise<string> {
    const gameId = uuidv4();
    const newGame = this.gameRepository.create({
      id: gameId,
      board: this.initialBoard(), // Agora armazenado corretamente como JSONB
      turn: 'w',
      winner: null,
    });

    await this.gameRepository.save(newGame);
    return gameId;
  }

  async getGame(gameId: string): Promise<Game | null> {
    return await this.gameRepository.findOne({ where: { id: gameId } });
  }

  async makeMove(gameId: string, from: [number, number], to: [number, number]) {
    const game = await this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Jogo não encontrado' };
    }

    // Criando uma cópia do tabuleiro para modificar
    const newBoard = game.board.map((row) => [...row]);

    // Obtendo as coordenadas de origem e destino
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    // Valida se existe uma peça na posição inicial
    if (!newBoard[fromRow][fromCol]) {
      return { success: false, message: 'Nenhuma peça na posição inicial' };
    }

    // Movendo a peça
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '';

    // Alternando o turno
    const newTurn = game.turn === 'w' ? 'b' : 'w';

    // Atualizando no banco
    await this.gameRepository.update(gameId, {
      board: newBoard, // Salva como JSONB
      turn: newTurn,
    });

    return { success: true, board: newBoard, turn: newTurn };
  }
}
