import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Chess } from 'chess.js';

@WebSocketGateway({ cors: true })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.gameService.joinGame(gameId, client.id);
    client.emit('gameState', { fen: game.fen() });
    client.emit('playerColor', game.turn());
  }

  @SubscribeMessage('move')
  handleMove(
    @MessageBody() data: { gameId: string; move: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { gameId, move } = data;
    const game = this.gameService.makeMove(gameId, move);

    if (game) {
      this.server.to(gameId).emit('gameState', { fen: game.fen() });

      if (game.game_over()) {
        if (game.in_checkmate()) {
          this.server.to(gameId).emit('gameOver', `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`);
        } else if (game.in_draw()) {
          this.server.to(gameId).emit('gameOver', 'Draw!');
        }
      }
    }
  }

  @SubscribeMessage('createGame')
  handleCreateGame(@ConnectedSocket() client: Socket) {
    const gameId = this.gameService.createGame();
    client.emit('gameId', gameId);
  }
}