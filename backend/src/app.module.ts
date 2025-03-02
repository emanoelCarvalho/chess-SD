import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { PlayersModule } from './players/players.module';
import { GameModule } from './game/game.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [PlayersModule, GameModule, DatabaseModule],
  providers: [GameGateway],
})
export class AppModule {}
