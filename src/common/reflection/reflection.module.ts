import { Module, Global } from '@nestjs/common';
import { ReflectionService } from './reflection.service';
import { AdvancedMetadataService } from '../metadata/advanced-metadata.service';

@Global()
@Module({
  providers: [ReflectionService, AdvancedMetadataService],
  exports: [ReflectionService, AdvancedMetadataService],
})
export class ReflectionModule {}
