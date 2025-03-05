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

@WebSocketGateway(4000, { cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`⚠️ Cliente desconectado: ${client.id}`);
    // Limpar salas ao desconectar
    client.rooms.forEach((room) => client.leave(room));
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@ConnectedSocket() client: Socket) {
    try {
      const gameId = await this.gameService.createGame();
      client.join(gameId);
      client.emit('gameCreated', gameId);
      this.logger.log(`🎲 Novo jogo criado: ${gameId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar jogo: ${error.message}`);
      client.emit('error', { message: 'Falha ao criar jogo' });
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!gameId) throw new Error('ID do jogo não fornecido');

      // Sai de todas as salas antes de entrar em uma nova
      client.rooms.forEach((room) => {
        if (room !== client.id) client.leave(room);
      });

      const game = await this.gameService.getGame(gameId);
      if (!game) throw new Error('Jogo não encontrado');

      client.join(gameId);
      client.emit('gameState', { fen: game.fen });
      this.logger.log(`👥 Cliente ${client.id} entrou no jogo ${gameId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }
  @SubscribeMessage('move')
async handleMove(
  @MessageBody() data: { gameId: string; move: string },
  @ConnectedSocket() client: Socket,
) {
  try {
    // Validação básica
    if (!data?.gameId || !data?.move || data.move.length !== 4) {
      throw new Error('Requisição inválida');
    }

    // Verifica se o cliente pertence ao jogo
    if (!client.rooms.has(data.gameId)) {
      throw new Error('Você não está neste jogo');
    }

    const result = await this.gameService.makeMove(data.gameId, data.move);
    
    if (!result.success) {
      throw new Error(result.message);
    }

    // Envia atualização para todos os jogadores
    this.server.to(data.gameId).emit('gameUpdate', {
      fen: result.fen,
      lastMove: data.move
    });

  } catch (error) {
    client.emit('moveError', { message: error.message });
  }
}}
