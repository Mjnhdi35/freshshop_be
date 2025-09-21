export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface FilterOptions {
  field: string;
  operator: FilterOperator;
  value: any;
  values?: any[];
}

export type FilterOperator =
  | 'eq' // equals
  | 'ne' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'in' // in array
  | 'nin' // not in array
  | 'like' // like pattern
  | 'ilike' // case insensitive like
  | 'between' // between two values
  | 'isNull' // is null
  | 'isNotNull' // is not null
  | 'contains' // contains substring
  | 'startsWith' // starts with
  | 'endsWith' // ends with
  | 'regex' // regex pattern
  | 'dateRange' // date range
  | 'exists' // field exists
  | 'size' // array size
  | 'all' // all elements match
  | 'any' // any element matches
  | 'near' // near coordinates (for geo queries)
  | 'within'; // within polygon (for geo queries);

export interface SearchOptions {
  query: string;
  fields?: string[];
  mode?: 'exact' | 'partial' | 'fuzzy';
  caseSensitive?: boolean;
}

export interface RelationOptions {
  relations?: string[];
  maxDepth?: number;
  eager?: boolean;
}

export interface SelectOptions {
  fields?: string[];
  exclude?: string[];
}

export interface QueryBuilderOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filters?: FilterOptions[];
  search?: SearchOptions;
  relations?: RelationOptions;
  select?: SelectOptions;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    offset: number;
  };
}

export interface QueryResult<T> {
  data: T[];
  total?: number;
  pagination?: PaginatedResult<T>['pagination'];
}

export interface AdvancedQueryOptions extends QueryBuilderOptions {
  // Advanced options
  groupBy?: string[];
  having?: FilterOptions[];
  distinct?: boolean;
  cache?: boolean | number; // cache for X seconds
  lock?: 'pessimistic_read' | 'pessimistic_write' | 'dirty_read';
  timeout?: number;
  explain?: boolean;
}

export interface QueryContext {
  user?: any;
  permissions?: string[];
  tenantId?: string;
  locale?: string;
  timezone?: string;
}

export interface QueryExecutionOptions {
  context?: QueryContext;
  transaction?: any;
  isolation?:
    | 'READ_UNCOMMITTED'
    | 'READ_COMMITTED'
    | 'REPEATABLE_READ'
    | 'SERIALIZABLE';
}
