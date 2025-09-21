import { Module, Global } from '@nestjs/common';
import { AdvancedQueryBuilderService } from './advanced-query-builder.service';
import { DynamicQueryBuilderService } from './dynamic-query-builder.service';
import { ReflectionModule } from '../reflection/reflection.module';

@Global()
@Module({
  imports: [ReflectionModule],
  providers: [AdvancedQueryBuilderService, DynamicQueryBuilderService],
  exports: [AdvancedQueryBuilderService, DynamicQueryBuilderService],
})
export class QueryBuilderModule {}
