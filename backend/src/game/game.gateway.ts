import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway(4000, {
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('createGame')
  handleCreateGame(@ConnectedSocket() client: Socket) {
    const gameId = this.gameService.createGame();
    
    client.join(gameId);
    client.emit('gameId', gameId);

    console.log(`Novo jogo criado: ${gameId}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.gameService.joinGame(gameId);
    
    if (!game) {
      client.emit('error', 'Game not found');
      return;
    }

    client.join(gameId);
    client.emit('gameState', { fen: game.fen() });
    client.emit('playerColor', game.turn());

    console.log(`Cliente ${client.id} entrou no jogo ${gameId}`);
  }

  @SubscribeMessage('move')
  handleMove(
    @MessageBody() data: { gameId: string; move: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, move } = data;
    const game = this.gameService.makeMove(gameId, move);

    if (!game) {
      client.emit('error', 'Invalid move');
      return;
    }

    // Atualiza o estado do jogo para todos os jogadores da sala
    this.server.to(gameId).emit('gameState', { fen: game.fen() });

    if (game.isGameOver()) {
      let result = 'Game Over!';
      if (game.isCheckmate()) {
        result = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
      } else if (game.isDraw()) {
        result = 'Draw!';
      }
      this.server.to(gameId).emit('gameOver', result);
    }

    console.log(`Movimento realizado no jogo ${gameId}:`, move);
  }
}
