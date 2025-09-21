import { Module, Global } from '@nestjs/common';
import { ReflectionModule } from '../reflection/reflection.module';
import { QueryBuilderModule } from '../query-builder/query-builder.module';

@Global()
@Module({
  imports: [ReflectionModule, QueryBuilderModule],
  providers: [],
  exports: [],
})
export class BaseServiceModule {}
