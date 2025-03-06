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
import { Chess } from 'chess.js';

@WebSocketGateway(4000, { cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private playerRoles: Map<string, { gameId: string; color: 'white' | 'black' }> = new Map();

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`⚠️ Cliente desconectado: ${client.id}`);
    this.playerRoles.delete(client.id);
    client.rooms.forEach((room) => client.leave(room));
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@ConnectedSocket() client: Socket) {
    try {
      const gameId = await this.gameService.createGame();
      client.join(gameId);
      this.playerRoles.set(client.id, { gameId, color: 'white' });
      client.emit('gameCreated', { gameId, color: 'white' });
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
      // Validação básica
      if (!gameId || typeof gameId !== 'string') {
        throw new Error('ID do jogo inválido');
      }

      // Verificar se o jogo existe
      const game = await this.gameService.getGame(gameId);
      if (!game) throw new Error('Jogo não encontrado');

      // Verificar lotação máxima
      const room = this.server.sockets.adapter.rooms.get(gameId);
      if (room?.size >= 2) {
        throw new Error('Jogo já está cheio');
      }

      // Entrar na sala e atribuir cor
      client.join(gameId);
      const color = room?.size === 1 ? 'black' : 'white';
      this.playerRoles.set(client.id, { gameId, color });

      // Notificar jogador
      client.emit('gameJoined', { 
        fen: game.fen,
        color,
        opponent: room?.size === 2 ? 'ready' : 'waiting'
      });

      // Notificar outros jogadores
      if (room?.size === 2) {
        this.server.to(gameId).emit('gameStart', { fen: game.fen });
      }

      this.logger.log(`👤 ${client.id} entrou no ${gameId} como ${color}`);
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
      // Validação de dados
      if (!data || typeof data.gameId !== 'string' || typeof data.move !== 'string') {
        throw new Error('Dados inválidos');
      }

      // Verificar associação do jogador
      const player = this.playerRoles.get(client.id);
      if (!player || player.gameId !== data.gameId) {
        throw new Error('Não autorizado');
      }

      // Verificar turno
      const game = await this.gameService.getGame(data.gameId);
      const chess = new Chess(game.fen);
      const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
      if (currentTurn !== player.color) {
        throw new Error('Não é seu turno');
      }

      // Executar movimento
      const result: { success: boolean; message?: string; fen?: string; winner?: string } = await this.gameService.makeMove(data.gameId, data.move);
      if (!result.success) throw new Error(result.message);

      // Atualizar todos os jogadores
      this.server.to(data.gameId).emit('gameUpdate', { 
        fen: result.fen,
        lastMove: data.move,
        turn: chess.turn() === 'w' ? 'white' : 'black'
      });

      // Verificar fim de jogo
      if (result.winner) {
        this.server.to(data.gameId).emit('gameOver', { winner: result.winner });
      }

    } catch (error) {
      client.emit('moveError', { message: error.message });
      this.logger.error(`Erro no movimento: ${error.message}`);
    }
  }
}