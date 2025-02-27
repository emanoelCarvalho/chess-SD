import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { PlayersModule } from './players/players.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PlayersModule, GameModule],
  providers: [ GameGateway],
})
export class AppModule {}
