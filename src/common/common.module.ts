import { Module, Global } from '@nestjs/common';
import { ReflectionModule } from './reflection/reflection.module';
import { QueryBuilderModule } from './query-builder/query-builder.module';
import { BaseServiceModule } from './base-service/base-service.module';

// SOLID Architecture Modules
import { AdvancedMetadataService } from './metadata/advanced-metadata.service';
import {
  AdvancedDependencyContainer,
  ServiceRegistry,
  ModuleRegistry,
} from './di/advanced-di-container.service';
import { AdvancedRuntimeValidationService } from './validation/advanced-runtime-validation.service';

/**
 * SOLID Principles Implementation:
 * S - Single Responsibility: Each module has one responsibility
 * O - Open/Closed: Open for extension, closed for modification
 * L - Liskov Substitution: All implementations are substitutable
 * I - Interface Segregation: Focused interfaces
 * D - Dependency Inversion: Depends on abstractions
 */
@Global()
@Module({
  imports: [ReflectionModule, QueryBuilderModule, BaseServiceModule],
  providers: [
    // SOLID Architecture Services
    AdvancedMetadataService,
    AdvancedDependencyContainer,
    {
      provide: ServiceRegistry,
      useFactory: (container: AdvancedDependencyContainer) =>
        new ServiceRegistry(container),
      inject: [AdvancedDependencyContainer],
    },
    ModuleRegistry,
    AdvancedRuntimeValidationService,
  ],
  exports: [
    // Legacy modules
    ReflectionModule,
    QueryBuilderModule,
    BaseServiceModule,

    // SOLID Architecture Services
    AdvancedMetadataService,
    AdvancedDependencyContainer,
    ServiceRegistry,
    ModuleRegistry,
    AdvancedRuntimeValidationService,
  ],
})
export class CommonModule {}
