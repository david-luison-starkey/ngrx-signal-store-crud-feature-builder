import { HttpOptions, PrivateSignalStoreCrudMethods, TrailingSlashUrl } from "./models";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { first, Observable } from "rxjs";
import { signalStoreFeature, withMethods } from "@ngrx/signals";
import { inject } from "@angular/core";

class CrudBuilder<
  Type,
  AccumulatedCrudMethods extends Partial<
    Record<PrivateSignalStoreCrudMethods, (...args: unknown[]) => unknown>
  > = {},
> {
  private readonly _get = (httpClient: HttpClient) => (id: string) =>
    httpClient.get<Type[]>(`${this.baseApiUrl}${id}`, this.httpOptions).pipe(first());

  private readonly _getAll = (httpClient: HttpClient) => () =>
    httpClient.get<Type>(`${this.baseApiUrl}`, this.httpOptions).pipe(first());

  private readonly _create =
    <CreateType>(httpClient: HttpClient) =>
    (id: string, data: CreateType) =>
      httpClient.post<Type>(`${this.baseApiUrl}${id}`, data, this.httpOptions).pipe(first());

  private readonly _update =
    <UpdateType>(httpClient: HttpClient) =>
    (id: string, data: UpdateType) =>
      httpClient.put<Type>(`${this.baseApiUrl}${id}`, data, this.httpOptions).pipe(first());

  private readonly _delete = (httpClient: HttpClient) => (id: string) =>
    httpClient.delete<void>(`${this.baseApiUrl}${id}`, this.httpOptions).pipe(first());

  private constructor(
    private readonly baseApiUrl: TrailingSlashUrl,
    private readonly httpOptions: HttpOptions,
    private accumulatedCrudMethods: AccumulatedCrudMethods,
  ) {}

  public static of<Type>(
    baseApiUrl: TrailingSlashUrl,
    httpOptions?: HttpOptions,
  ): CrudBuilder<Type, {}> {
    return new CrudBuilder<Type>(
      baseApiUrl,
      {
        headers: new HttpHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        withCredentials: true,
        ...httpOptions,
      },
      {},
    );
  }

  public get() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _get: this._get,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_get", (id: string) => Observable<Type>>
    >;
  }

  public getAll() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _getAll: this._getAll,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_getAll", () => Observable<Type[]>>
    >;
  }

  public create<CreateType = never>() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _create: this._create<CreateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_create", (id: string, data: CreateType) => Observable<Type>>
    >;
  }

  public update<UpdateType = never>() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _update: this._update<UpdateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_update", (id: string, data: UpdateType) => Observable<Type>>
    >;
  }

  public delete() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _delete: this._delete,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_delete", (id: string) => Observable<void>>
    >;
  }

  public build() {
    return signalStoreFeature(
      withMethods((_, httpClient = inject(HttpClient)) => {
        return {
          ...Object.entries(this.accumulatedCrudMethods).reduce((acc, [key, value]) => {
            acc = {
              ...acc,
              [key]: value(httpClient),
            };
            return acc;
          }, {} as AccumulatedCrudMethods),
        };
      }),
    );
  }
}

export function withCrudMethods<Type = never>(baseApiUrl: TrailingSlashUrl): CrudBuilder<Type, {}> {
  return CrudBuilder.of<Type>(baseApiUrl);
}
