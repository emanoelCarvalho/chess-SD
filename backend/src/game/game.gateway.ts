import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Logger } from '@nestjs/common';

const SOCKET_CONFIG = {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
};

@WebSocketGateway(4000, SOCKET_CONFIG)
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private playerRoles: Map<string, { gameId: string; color: string }> =
    new Map();

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
    client.on('error', (err) => {
      this.logger.error(`Erro na conexão ${client.id}: ${err.message}`);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`⚠️ Cliente desconectado: ${client.id}`);
    this.cleanupClient(client);
  }

  private cleanupClient(client: Socket) {
    client.rooms.forEach((room) => {
      client.leave(room);
      this.server.to(room).emit('playerLeft', { playerId: client.id });
    });
    this.playerRoles.delete(client.id);
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const gameId = await this.gameService.createGame();
      client.join(gameId);
      this.playerRoles.set(client.id, { gameId, color: 'white' });

      client.emit('gameCreated', {
        gameId,
        color: 'white',
        players: [client.id],
      });

      this.logger.log(`🎲 Novo jogo criado: ${gameId} por ${client.id}`);
    } catch (error) {
      this.handleError(client, 'createGame', error);
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!this.validateGameId(client, gameId)) return;

      const game = await this.gameService.getGame(gameId);
      if (!game) {
        client.emit('error', {
          code: 'GAME_NOT_FOUND',
          message: 'Jogo não encontrado',
        });
        return;
      }

      const color = this.assignPlayerColor(gameId);
      this.playerRoles.set(client.id, { gameId, color });

      client.join(gameId);
      this.notifyGameJoin(client, gameId, color, game);
    } catch (error) {
      this.handleError(client, 'joinGame', error);
    }
  }

  @SubscribeMessage('move')
  async handleMove(
    @MessageBody()
    data: {
      gameId: string;
      from: [number, number];
      to: [number, number];
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!this.validateMoveData(client, data)) return;

      const result = await this.gameService.makeMove(
        data.gameId,
        data.from,
        data.to,
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      this.server.to(data.gameId).emit('gameUpdate', {
        board: result.board,
        turn: result.turn,
        lastMove: { from: data.from, to: data.to },
        player: client.id,
      });
    } catch (error) {
      this.handleError(client, 'move', error);
    }
  }

  private validateGameId(client: Socket, gameId: string): boolean {
    if (!gameId || typeof gameId !== 'string') {
      client.emit('error', {
        code: 'INVALID_GAME_ID',
        message: 'ID do jogo inválido',
      });
      return false;
    }

    if (client.rooms.has(gameId)) {
      client.emit('error', {
        code: 'ALREADY_IN_GAME',
        message: 'Você já está neste jogo',
      });
      return false;
    }
    return true;
  }

  private assignPlayerColor(gameId: string): string {
    const players = Array.from(this.playerRoles.values()).filter(
      (p) => p.gameId === gameId,
    );

    return players.length % 2 === 0 ? 'white' : 'black';
  }

  private notifyGameJoin(
    client: Socket,
    gameId: string,
    color: string,
    game: any,
  ) {
    client.emit('gameJoined', {
      gameId,
      color,
      board: game.board,
      turn: game.turn,
      players: Array.from(this.getPlayersInGame(gameId)),
    });

    client.to(gameId).emit('playerJoined', {
      playerId: client.id,
      color,
      totalPlayers: this.playerRoles.size,
    });

    this.logger.log(`👥 ${client.id} entrou no jogo ${gameId} como ${color}`);
  }

  private validateMoveData(client: Socket, data: any): boolean {
    const playerInfo = this.playerRoles.get(client.id);

    if (!playerInfo || playerInfo.gameId !== data.gameId) {
      client.emit('moveError', {
        code: 'NOT_IN_GAME',
        message: 'Você não está neste jogo',
      });
      return false;
    }

    const isValidMove =
      data.from?.length === 2 &&
      data.to?.length === 2 &&
      data.from.every(Number.isInteger) &&
      data.to.every(Number.isInteger) &&
      data.from.every((n) => n >= 0 && n < 8) &&
      data.to.every((n) => n >= 0 && n < 8);

    if (!isValidMove) {
      client.emit('moveError', {
        code: 'INVALID_MOVE_FORMAT',
        message: 'Formato de movimento inválido',
      });
      return false;
    }

    return true;
  }

  private getPlayersInGame(gameId: string): string[] {
    return Array.from(this.playerRoles.entries())
      .filter(([_, info]) => info.gameId === gameId)
      .map(([id]) => id);
  }

  private handleError(client: Socket, context: string, error: Error) {
    this.logger.error(`Erro em ${context}: ${error.message}`, error.stack);
    client.emit('error', {
      code: 'INTERNAL_ERROR',
      message: `Erro durante ${context}`,
      details: error.message,
    });
  }
}
