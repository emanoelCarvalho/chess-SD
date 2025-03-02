import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'seu_usuario', // Substitua pelo usuário do seu PostgreSQL
      password: 'sua_senha', // Substitua pela senha do seu PostgreSQL
      database: 'chess_db', // Substitua pelo nome do seu banco de dados
      entities: [Game], // Registra a entidade Game
      synchronize: true,
    }),
  ],
})
export class DatabaseModule {}
