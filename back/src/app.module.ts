import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './game/game.gateway';
import { PlayersModule } from './players/players.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PlayersModule, GameModule],
  controllers: [AppController],
  providers: [AppService, GameGateway],
})
export class AppModule {}
