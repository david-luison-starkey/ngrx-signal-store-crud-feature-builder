import { HttpContext, HttpHeaders, HttpParams } from "@angular/common/http";

export type CrudMethods = "create" | "update" | "get" | "getAll" | "delete";

export type PrivateSignalStoreCrudMethods = `_${CrudMethods}`;

export type TrailingSlashUrl = `${string}/`;

/**
 * Type vendored from `@angular/common/http` crud methods `options` parameter.
 */
export type HttpOptions = {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  observe?: "body";
  params?:
    | HttpParams
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
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
