import { inject } from "@angular/core";
import { PrivateSignalStoreCrudMethods } from "./models";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { first, Observable } from "rxjs";
import { signalStoreFeature, withMethods } from "@ngrx/signals";

class CrudBuilder<
  Type,
  AccumulatedCrudMethods extends Partial<
    Record<PrivateSignalStoreCrudMethods, (...args: unknown[]) => unknown>
  > = {},
> {
  private readonly httpClient = inject(HttpClient);

  private readonly _get = (id: string) =>
    this.httpClient.get<Type[]>(`${this.baseApiUrl}/${id}`, this.httpOptions).pipe(first());

  private readonly _getAll = () =>
    this.httpClient.get<Type>(`${this.baseApiUrl}`, this.httpOptions).pipe(first());

  private readonly _create = <CreateType>(id: string, data: CreateType) =>
    this.httpClient.post<Type>(`${this.baseApiUrl}/${id}`, data, this.httpOptions).pipe(first());

  private readonly _update = <UpdateType>(id: string, data: UpdateType) =>
    this.httpClient.put<Type>(`${this.baseApiUrl}/${id}`, data, this.httpOptions).pipe(first());

  private readonly _delete = (id: string) =>
    this.httpClient.delete<void>(`${this.baseApiUrl}/${id}`, this.httpOptions).pipe(first());

  private constructor(
    private readonly baseApiUrl: string,
    private accumulatedCrudMethods: AccumulatedCrudMethods,
  ) {}

  static of<Type>(baseApiUrl: string) {
    return new CrudBuilder<Type>(baseApiUrl, {});
  }

  get headers(): HttpHeaders {
    const headersConfig = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    return new HttpHeaders(headersConfig);
  }

  get httpOptions() {
    return {
      headers: this.headers,
      withCredentials: true,
    };
  }

  get() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _get: this._get,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_get", (id: string) => Observable<Type>>
    >;
  }

  getAll() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _getAll: this._getAll,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_getAll", () => Observable<Type[]>>
    >;
  }

  create<CreateType = never>() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _create: this._create<CreateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_create", (id: string, data: CreateType) => Observable<Type>>
    >;
  }

  update<UpdateType = never>() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _update: this._update<UpdateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_update", (id: string, data: UpdateType) => Observable<Type>>
    >;
  }

  delete() {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _delete: this._delete,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_delete", (id: string) => Observable<void>>
    >;
  }

  build() {
    return signalStoreFeature(withMethods(() => ({ ...this.accumulatedCrudMethods })));
  }
}

export function withCrudMethods<Type = never>(baseApiUrl: string) {
  return CrudBuilder.of<Type>(baseApiUrl);
}
