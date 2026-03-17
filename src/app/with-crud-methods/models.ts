import { type HttpContext, type HttpHeaders, type HttpParams } from "@angular/common/http";
import { EntityId } from "@ngrx/signals/entities";

/**
 * Base crud method namespaces supported by {@link withCrudMethods}.
 */
export type CrudMethods = "get" | "getAll" | "pagedSearch" | "create" | "update" | "delete";

/**
 * NgRx Signal Store treats methods with an underscore prefix as private.
 *
 * This type performs said transformation for methods built by
 * {@link withCrudMethods} as they are intended for store consumption only.
 */
export type PrivateSignalStoreCrudMethods = `_${CrudMethods}`;

/**
 * Type vendored from `@angular/common/http` crud methods `options: { params }`
 * parameter.
 *
 * @see https://angular.dev/api/common/http/HttpClient
 */
export type HttpClientParams =
  | HttpParams
  | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

/**
 * Type vendored from `@angular/common/http` crud methods `options` parameter.
 *
 * @see https://angular.dev/api/common/http/HttpClient
 */
export type HttpOptions = {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  observe?: "body";
  params?:
    | HttpParams
    | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  reportProgress?: boolean;
  responseType?: "json";
  withCredentials?: boolean;
  credentials?: RequestCredentials;
  keepalive?: boolean;
  priority?: RequestPriority;
  cache?: RequestCache;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  integrity?: string;
  referrerPolicy?: ReferrerPolicy;
  transferCache?:
    | {
        includeHeaders?: string[];
      }
    | boolean;
  timeout?: number;
};

/**
 * Response from paginated search queries.
 */
export interface PagedResponse<Type> {
  totalResults: number;
  totalPages: number;
  pageNumber: number;
  entriesPerPage: number;
  offset: number;
  results: Type[];
}

/**
 * Compatible signature for NgRx Signal Store `withEntities` generic type.
 */
export type Entity = {
  id: EntityId;
};

/**
 * @typeParam Collection - Name of `withEntities` collection.
 * @typeParam CrudMethods - Record of method names and function signatures.
 */
export type CollectionCrudMethods<
  Collection extends string,
  CrudMethods extends Record<string, unknown>,
> = {
  [Key in string & keyof CrudMethods as `${Key}${Capitalize<Collection>}`]: CrudMethods[Key];
};

export type DevToolsActionPrefix<Name extends string> = `[${Capitalize<Name>}]`;

export type DeriveConsistentCollectionAndMethodName<
  Name extends string,
  ExtantName extends string,
> = ExtantName extends "" ? Name : ExtantName;
