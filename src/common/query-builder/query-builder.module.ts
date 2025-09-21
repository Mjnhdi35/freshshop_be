import { Module, Global } from '@nestjs/common';
import { AdvancedQueryBuilderService } from './advanced-query-builder.service';
import { ReflectionModule } from '../reflection/reflection.module';

@Global()
@Module({
  imports: [ReflectionModule],
  providers: [AdvancedQueryBuilderService],
  exports: [AdvancedQueryBuilderService],
})
export class QueryBuilderModule {}
