import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  // Export so AuthModule can inject UsersService
  exports: [UsersService],
})
export class UsersModule {}
