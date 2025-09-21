import { Module, Global } from '@nestjs/common';
import { ReflectionModule } from './reflection/reflection.module';
import { QueryBuilderModule } from './query-builder/query-builder.module';
import { BaseServiceModule } from './base-service/base-service.module';

@Global()
@Module({
  imports: [ReflectionModule, QueryBuilderModule, BaseServiceModule],
  exports: [ReflectionModule, QueryBuilderModule, BaseServiceModule],
})
export class CommonModule {}
