import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from 'src/game/entities/game.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'postgres', 
      password: 'faculdade', 
      database: 'chess_db', 
      entities: [Game],
      synchronize: true,
    }),
  ],
})
export class DatabaseModule {}
