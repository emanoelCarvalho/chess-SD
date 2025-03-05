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
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(@ConnectedSocket() client: Socket) {
    try {
      const gameId = await this.gameService.createGame();
      client.join(gameId);
      client.emit('gameId', gameId);
      this.logger.log(`🎲 Novo jogo criado: ${gameId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar jogo: ${error.message}`);
      client.emit('error', 'Erro ao criar jogo, tente novamente.');
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!gameId) {
        throw new Error('ID do jogo não fornecido');
      }

      const game = await this.gameService.getGame(gameId);
      if (!game) {
        throw new Error('Jogo não encontrado');
      }

      // Verifica se `game.moves` está definido
      const moves = game.moves || '';

      client.join(gameId);
      client.emit('gameState', { fen: game.fen });
      client.emit('playerColor', moves.length % 2 === 0 ? 'white' : 'black');

      this.logger.log(`👤 Cliente ${client.id} entrou no jogo ${gameId}`);
    } catch (error) {
      this.logger.error(`Erro ao entrar no jogo: ${error.message}`);
      client.emit('error', 'Erro ao entrar no jogo, verifique o ID.');
    }
  }

  @SubscribeMessage('move')
  async handleMove(
    @MessageBody() data: { gameId: string; move: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { gameId, move } = data;
      if (!gameId || !move) {
        throw new Error('Dados inválidos para o movimento');
      }

      // Verifica se o jogador está na sala
      const rooms = Array.from(client.rooms);
      if (!rooms.includes(gameId)) {
        throw new Error('Você não está nesta partida');
      }

      // Valida e aplica o movimento
      const result = await this.gameService.makeMove(gameId, move);
      if (!result.success) {
        throw new Error(result.message);
      }

      // Atualiza o estado do jogo para todos os jogadores na sala
      this.server.to(gameId).emit('gameState', { fen: result.fen });

      // Verifica se o jogo terminou
      const gameOverMessage = await this.gameService.checkGameOver(gameId);
      if (gameOverMessage.success) {
        this.server.to(gameId).emit('gameOver', gameOverMessage);
      }

      this.logger.log(`♟️ Movimento realizado no jogo ${gameId}: ${move}`);
    } catch (error) {
      this.logger.error(`Erro ao realizar movimento: ${error.message}`);
      client.emit('error', 'Movimento inválido ou erro interno.');
    }
  }
}