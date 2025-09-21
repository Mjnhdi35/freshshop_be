import { Module, Global } from '@nestjs/common';
import { ReflectionService } from './reflection.service';

@Global()
@Module({
  providers: [ReflectionService],
  exports: [ReflectionService],
})
export class ReflectionModule {}
