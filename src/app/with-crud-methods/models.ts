import { type HttpContext, type HttpHeaders, type HttpParams } from "@angular/common/http";

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
 * Type to enforce the shape of search query strings provided to `_pagedSearch`.
 */
export type QueryString = `?${string}`;

/**
 * Type vendored from `@angular/common/http` crud methods `options` parameter.
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
