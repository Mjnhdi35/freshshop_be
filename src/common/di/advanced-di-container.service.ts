import 'reflect-metadata';
import { Injectable, Logger, Type } from '@nestjs/common';

/**
 * SOLID Principles Implementation:
 * S - Single Responsibility: Only handles dependency injection
 * O - Open/Closed: Extensible through interfaces
 * L - Liskov Substitution: All implementations are substitutable
 * I - Interface Segregation: Focused interfaces
 * D - Dependency Inversion: Depends on abstractions
 */

// Interfaces following Interface Segregation Principle
export interface IDependencyContainer {
  register<T>(token: string | Type<T>, implementation: Type<T>): void;
  registerSingleton<T>(token: string | Type<T>, implementation: Type<T>): void;
  registerInstance<T>(token: string | Type<T>, instance: T): void;
  resolve<T>(token: string | Type<T>): T;
  isRegistered(token: string | Type<any>): boolean;
  clear(): void;
}

export interface IServiceRegistry {
  registerService<T>(service: Type<T>): void;
  getService<T>(service: Type<T>): T;
  getAllServices(): Map<string, any>;
}

export interface IModuleRegistry {
  registerModule(module: any): void;
  getModule(moduleName: string): any;
  getAllModules(): Map<string, any>;
}

// Dependency types
export enum DependencyType {
  TRANSIENT = 'transient',
  SINGLETON = 'singleton',
  INSTANCE = 'instance',
}

export interface IDependencyInfo {
  type: DependencyType;
  implementation: Type<any>;
  instance?: any;
  dependencies: string[];
}

/**
 * Advanced Dependency Injection Container
 * Following SOLID principles and IoC patterns
 */
@Injectable()
export class AdvancedDependencyContainer implements IDependencyContainer {
  private readonly logger = new Logger(AdvancedDependencyContainer.name);
  private readonly dependencies = new Map<string, IDependencyInfo>();
  private readonly instances = new Map<string, any>();
  private readonly circularDependencyCheck = new Set<string>();

  constructor() {
    this.logger.log('🚀 AdvancedDependencyContainer initialized');
  }

  /**
   * Register a transient dependency
   */
  register<T>(token: string | Type<T>, implementation: Type<T>): void {
    const tokenKey = this.getTokenKey(token);
    const dependencies = this.extractDependencies(implementation);

    this.dependencies.set(tokenKey, {
      type: DependencyType.TRANSIENT,
      implementation,
      dependencies,
    });

    this.logger.debug(`📝 Registered transient: ${tokenKey}`);
  }

  /**
   * Register a singleton dependency
   */
  registerSingleton<T>(token: string | Type<T>, implementation: Type<T>): void {
    const tokenKey = this.getTokenKey(token);
    const dependencies = this.extractDependencies(implementation);

    this.dependencies.set(tokenKey, {
      type: DependencyType.SINGLETON,
      implementation,
      dependencies,
    });

    this.logger.debug(`📝 Registered singleton: ${tokenKey}`);
  }

  /**
   * Register an instance
   */
  registerInstance<T>(token: string | Type<T>, instance: T): void {
    const tokenKey = this.getTokenKey(token);

    this.dependencies.set(tokenKey, {
      type: DependencyType.INSTANCE,
      implementation: (instance as any).constructor as Type<T>,
      instance,
      dependencies: [], // Instances don't have dependencies
    });

    this.instances.set(tokenKey, instance);
    this.logger.debug(`📝 Registered instance: ${tokenKey}`);
  }

  /**
   * Resolve a dependency
   */
  resolve<T>(token: string | Type<T>): T {
    const tokenKey = this.getTokenKey(token);

    // Check for circular dependencies
    if (this.circularDependencyCheck.has(tokenKey)) {
      throw new Error(`Circular dependency detected: ${tokenKey}`);
    }

    this.circularDependencyCheck.add(tokenKey);

    try {
      const dependency = this.dependencies.get(tokenKey);

      if (!dependency) {
        throw new Error(`Dependency not registered: ${tokenKey}`);
      }

      let instance: T;

      switch (dependency.type) {
        case DependencyType.INSTANCE:
          instance = dependency.instance as T;
          break;

        case DependencyType.SINGLETON:
          if (this.instances.has(tokenKey)) {
            instance = this.instances.get(tokenKey) as T;
          } else {
            instance = this.createInstance(dependency);
            this.instances.set(tokenKey, instance);
          }
          break;

        case DependencyType.TRANSIENT:
        default:
          instance = this.createInstance(dependency);
          break;
      }

      this.circularDependencyCheck.delete(tokenKey);
      return instance;
    } catch (error) {
      this.circularDependencyCheck.delete(tokenKey);
      this.logger.error(`❌ Failed to resolve ${tokenKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if dependency is registered
   */
  isRegistered(token: string | Type<any>): boolean {
    const tokenKey = this.getTokenKey(token);
    return this.dependencies.has(tokenKey);
  }

  /**
   * Clear all dependencies
   */
  clear(): void {
    this.dependencies.clear();
    this.instances.clear();
    this.circularDependencyCheck.clear();
    this.logger.log('🧹 Dependency container cleared');
  }

  /**
   * Get dependency statistics
   */
  getStats(): {
    totalDependencies: number;
    singletons: number;
    transients: number;
    instances: number;
  } {
    let singletons = 0;
    let transients = 0;
    let instances = 0;

    this.dependencies.forEach((dep) => {
      switch (dep.type) {
        case DependencyType.SINGLETON:
          singletons++;
          break;
        case DependencyType.TRANSIENT:
          transients++;
          break;
        case DependencyType.INSTANCE:
          instances++;
          break;
      }
    });

    return {
      totalDependencies: this.dependencies.size,
      singletons,
      transients,
      instances,
    };
  }

  /**
   * Validate dependency graph
   */
  validateDependencyGraph(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (tokenKey: string) => {
      if (visiting.has(tokenKey)) {
        errors.push(`Circular dependency detected: ${tokenKey}`);
        return;
      }

      if (visited.has(tokenKey)) {
        return;
      }

      visiting.add(tokenKey);
      const dependency = this.dependencies.get(tokenKey);

      if (dependency) {
        dependency.dependencies.forEach((dep) => {
          if (!this.dependencies.has(dep)) {
            errors.push(`Missing dependency: ${dep} required by ${tokenKey}`);
          } else {
            visit(dep);
          }
        });
      }

      visiting.delete(tokenKey);
      visited.add(tokenKey);
    };

    this.dependencies.forEach((_, tokenKey) => {
      if (!visited.has(tokenKey)) {
        visit(tokenKey);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create instance with dependency injection
   */
  private createInstance<T>(dependency: IDependencyInfo): T {
    const dependencies = dependency.dependencies.map((dep) =>
      this.resolve(dep),
    );

    // Use Reflect.construct for proper instantiation
    const instance = Reflect.construct(dependency.implementation, dependencies);

    // Call lifecycle hooks if they exist
    if (typeof instance.onInit === 'function') {
      instance.onInit();
    }

    return instance as T;
  }

  /**
   * Extract dependencies from constructor using reflection
   */
  private extractDependencies(implementation: Type<any>): string[] {
    const dependencies: string[] = [];

    try {
      // Get constructor parameter types
      const paramTypes = Reflect.getMetadata(
        'design:paramtypes',
        implementation,
      );

      if (paramTypes) {
        paramTypes.forEach((paramType: any) => {
          if (paramType && paramType.name) {
            dependencies.push(paramType.name);
          }
        });
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Could not extract dependencies for ${implementation.name}:`,
        (error as Error).message,
      );
    }

    return dependencies;
  }

  /**
   * Get token key from token
   */
  private getTokenKey(token: string | Type<any>): string {
    if (typeof token === 'string') {
      return token;
    }
    return token.name;
  }
}

/**
 * Service Registry for managing services
 */
@Injectable()
export class ServiceRegistry implements IServiceRegistry {
  private readonly logger = new Logger(ServiceRegistry.name);
  private readonly services = new Map<string, any>();
  private readonly container: AdvancedDependencyContainer;

  constructor(container: AdvancedDependencyContainer) {
    this.container = container;
    this.logger.log('🚀 ServiceRegistry initialized');
  }

  /**
   * Register a service
   */
  registerService<T>(service: Type<T>): void {
    const serviceName = service.name;

    if (this.services.has(serviceName)) {
      this.logger.warn(
        `⚠️ Service ${serviceName} already registered, overwriting`,
      );
    }

    this.container.registerSingleton(serviceName, service);
    this.services.set(serviceName, service);

    this.logger.debug(`📝 Registered service: ${serviceName}`);
  }

  /**
   * Get a service instance
   */
  getService<T>(service: Type<T>): T {
    const serviceName = service.name;

    if (!this.services.has(serviceName)) {
      throw new Error(`Service not registered: ${serviceName}`);
    }

    return this.container.resolve<T>(serviceName);
  }

  /**
   * Get all registered services
   */
  getAllServices(): Map<string, any> {
    return new Map(this.services);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.logger.log('🧹 Service registry cleared');
  }
}

/**
 * Module Registry for managing modules
 */
@Injectable()
export class ModuleRegistry implements IModuleRegistry {
  private readonly logger = new Logger(ModuleRegistry.name);
  private readonly modules = new Map<string, any>();

  constructor() {
    this.logger.log('🚀 ModuleRegistry initialized');
  }

  /**
   * Register a module
   */
  registerModule(module: any): void {
    const moduleName = module.name || module.constructor.name;

    if (this.modules.has(moduleName)) {
      this.logger.warn(
        `⚠️ Module ${moduleName} already registered, overwriting`,
      );
    }

    this.modules.set(moduleName, module);
    this.logger.debug(`📝 Registered module: ${moduleName}`);
  }

  /**
   * Get a module
   */
  getModule(moduleName: string): any {
    const module = this.modules.get(moduleName);

    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    return module;
  }

  /**
   * Get all registered modules
   */
  getAllModules(): Map<string, any> {
    return new Map(this.modules);
  }

  /**
   * Clear all modules
   */
  clear(): void {
    this.modules.clear();
    this.logger.log('🧹 Module registry cleared');
  }
}
