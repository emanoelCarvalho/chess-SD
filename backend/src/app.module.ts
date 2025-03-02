import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { PlayersModule } from './players/players.module';
import { GameModule } from './game/game.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PlayersModule,
    GameModule,
    DatabaseModule,
  ],
  providers: [GameGateway],
})
export class AppModule {}
