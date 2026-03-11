import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject } from "@angular/core";
import {
  type EmptyFeatureResult,
  type SignalStoreFeature,
  signalStoreFeature,
  withMethods,
} from "@ngrx/signals";
import { first, type Observable } from "rxjs";
import {
  type HttpOptions,
  type PagedResponse,
  type PrivateSignalStoreCrudMethods,
  type QueryString,
} from "./models";

/**
 * Builder utility class to incrementally construct a {@link signalStoreFeature}
 * that exposes CRUD methods via {@link withCrudMethods} by way of
 * {@link withMethods}.
 *
 * All operations (excepting {@link build}) are optional, although building
 * with no intermediate operations results in a featureless `signalStoreFeature`.
 *
 * Changing methods in the builder allows TypeScript to maintain accurate
 * type references, until the `signalStoreFeature` is ultimately produced by
 * {@link build}.
 *
 * This class encapsulates an opinionated implementation of http requests to
 * enforce consistency. As such, customisation for consumers should be kept to a
 * minimum.
 *
 * @internal
 * @typeParam Type - The response object type for methods that are not void.
 * @typeParam AccumulatedCrudMethods - The methods that have been built so far.
 *
 */
export class CrudBuilder<
  Type,
  AccumulatedCrudMethods extends Partial<
    Record<PrivateSignalStoreCrudMethods, (...args: unknown[]) => unknown>
  > = object,
> {
  /*
   * We use function currying here to avoid having to pass a `HttpClient` object
   * and {@link InjectionToken} (for configuration-driven endpoint URLs) to
   * `withCrudMethods`. Otherwise, `withCrudMethods` would need to be wrapped by
   * `withFeature` to access the injected dependencies to then pass to
   * `withCrudMethods` reducing the ergonomics of the `withCrudMethods` API.
   *
   * Instead, {@link build} can handle passing any injected dependency to our
   * built methods directly, since it wraps `signalStoreFeature`, giving us access
   * to an injection context. As such, we can more easily extend behaviour without
   * affecting the public contract.
   *
   * @example
   * ```ts
   * // We can avoid this:
   * const Store = signalStore(
   *   withState({}),
   *   withFeature((store, httpClient = inject(HttpClient), apiBaseUrl = inject(API_BASE_URL) =>
   *     withCrudMethods<Applicant>(`${apiBaseUrl}/applicants`, httpClient)
   *       .get()
   *       .build()
   *   )
   * )
   * ```
   */
  private readonly _get = (httpClient: HttpClient, apiUrl: string) => (id: string) =>
    httpClient.get<Type>(`${apiUrl}/${id}`, this.httpOptions).pipe(first());

  private readonly _getAll = (httpClient: HttpClient, apiUrl: string) => () =>
    httpClient.get<Type[]>(apiUrl, this.httpOptions).pipe(first());

  private readonly _pagedSearch =
    (httpClient: HttpClient, apiUrl: string) => (searchQuery: QueryString) =>
      httpClient
        .get<PagedResponse<Type>>(`${apiUrl}${searchQuery}`, this.httpOptions)
        .pipe(first());

  private readonly _create =
    <CreateType>(httpClient: HttpClient, apiUrl: string) =>
    (data: CreateType) =>
      httpClient.post<Type>(apiUrl, data, this.httpOptions).pipe(first());

  private readonly _update =
    <UpdateType>(httpClient: HttpClient, apiUrl: string) =>
    (id: string, data: UpdateType) =>
      httpClient.put<Type>(`${apiUrl}/${id}`, data, this.httpOptions).pipe(first());

  private readonly _delete = (httpClient: HttpClient, apiUrl: string) => (id: string) =>
    httpClient.delete<void>(`${apiUrl}/${id}`, this.httpOptions).pipe(first());

  /**
   * Private constructor for the `CrudBuilder`, delegating construction and
   * provision of default arguments to {@link of}.
   *
   * @param apiUrlFactory - Function returning the base url to be used for all
   * http requests. Additional operation specific path segments (like id) will
   * be concatenated with `apiUrl`.
   * @param httpOptions - Options object used to configure http requests sent
   * with Angular's {@link HttpClient}.
   * @param accumulatedCrudMethods - Manages state of methods built using the
   * builder prior to invoking {@link build}.
   */
  private constructor(
    private readonly apiUrlFactory: () => string,
    private readonly httpOptions: Partial<HttpOptions>,
    private accumulatedCrudMethods: AccumulatedCrudMethods,
  ) {}

  public static of<Type>(
    apiUrlFactory: () => string,
    httpOptions?: Partial<HttpOptions>,
  ): CrudBuilder<Type> {
    return new CrudBuilder<Type>(
      apiUrlFactory,
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

  /**
   * Constructs a `_get(id: string): Observable<Type>` method that sends an http
   * GET request to {@link apiUrlFactory}`/id`.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .get()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<string>(
   *        pipe(
   *          switchMap((id: string) => store._get(id))
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public get(): CrudBuilder<
    Type,
    AccumulatedCrudMethods & Record<"_get", (id: string) => Observable<Type>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _get: this._get,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_get", (id: string) => Observable<Type>>
    >;
  }

  /**
   * Constructs a `_getAll(): Observable<Type[]>` method that sends an http
   * GET request to {@link apiUrlFactory}.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .getAll()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<void>(
   *        pipe(
   *          switchMap(() => store._getAll())
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public getAll(): CrudBuilder<
    Type,
    AccumulatedCrudMethods & Record<"_getAll", () => Observable<Type[]>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _getAll: this._getAll,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_getAll", () => Observable<Type[]>>
    >;
  }

  /**
   * Constructs a `_pagedSearch(searchQuery: QueryString): Observable<PagedResponse<Type>>`
   * method that sends an http GET request to {@link apiUrlFactory}`?searchQuery`.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .pagedSearch()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<QueryString>(
   *        pipe(
   *          switchMap((query) => store._pagedSearch(query))
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public pagedSearch(): CrudBuilder<
    Type,
    AccumulatedCrudMethods &
      Record<"_pagedSearch", (searchQuery: QueryString) => Observable<PagedResponse<Type>>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _pagedSearch: this._pagedSearch,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods &
        Record<"_pagedSearch", (searchQuery: QueryString) => Observable<PagedResponse<Type>>>
    >;
  }

  /**
   * Constructs a `_create(searchQuery: Type): Observable<Type>`
   * method that sends an http POST request to {@link apiUrlFactory}`?searchQuery`.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @typeParam CreateType - Payload type accepted by _create.
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .create<Course<Omit<Course, "id">>>()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<Omit<Course, "id">>(
   *        pipe(
   *          switchMap((newCourse) => store._create(newCourse))
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public create<CreateType = never>(): CrudBuilder<
    Type,
    AccumulatedCrudMethods & Record<"_create", (data: CreateType) => Observable<Type>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _create: this._create<CreateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_create", (data: CreateType) => Observable<Type>>
    >;
  }

  /**
   * Constructs an `_update(id: string, data: UpdateType): Observable<Type>>`
   * method that sends an http PUT request to {@link apiUrlFactory}`?searchQuery`.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @typeParam UpdateType - Payload type accepted by _update.
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .update<Partial<Course>>()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<{id: string, Partial<Course>}>(
   *        pipe(
   *          switchMap(({id, course}) => store._update(id, course))
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public update<UpdateType = never>(): CrudBuilder<
    Type,
    AccumulatedCrudMethods & Record<"_update", (id: string, data: UpdateType) => Observable<Type>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _update: this._update<UpdateType>,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_update", (id: string, data: UpdateType) => Observable<Type>>
    >;
  }

  /**
   * Constructs a `_delete(id: string): Observable<void>` method that sends an http
   * DELETE request to {@link apiUrlFactory}`/id`.
   *
   * {@link httpOptions} is used to configure the {@link HttpClient}.
   *
   * @example
   * ```ts
   *
   * const Store = signalStore(
   *  withState({}),
   *  withCrudMethods<Course>(() => "http://localhost:8080/courses")
   *    .delete()
   *    .build(),
   *  withMethods((store) => ({
   *      getCourse: rxMethod<string>(
   *        pipe(
   *          switchMap((id: string) => store._delete(id))
   *        )
   *      )
   *    })
   *   )
   * );
   * ```
   */
  public delete(): CrudBuilder<
    Type,
    AccumulatedCrudMethods & Record<"_delete", (id: string) => Observable<void>>
  > {
    this.accumulatedCrudMethods = {
      ...this.accumulatedCrudMethods,
      _delete: this._delete,
    };
    return this as CrudBuilder<
      Type,
      AccumulatedCrudMethods & Record<"_delete", (id: string) => Observable<void>>
    >;
  }

  /**
   * Builds a {@link signalStoreFeature} with all chained methods.
   */
  public build(): SignalStoreFeature<
    EmptyFeatureResult,
    { state: object; props: object; methods: AccumulatedCrudMethods }
  > {
    return signalStoreFeature(
      withMethods((_, httpClient = inject(HttpClient)) => {
        // Strip leading and trailing forward slashes.
        const apiUrl = this.apiUrlFactory().replace(/^\/+|\/+$/g, "");

        return {
          ...Object.entries(this.accumulatedCrudMethods).reduce((acc, [key, value]) => {
            acc = {
              ...acc,
              [key]: value(httpClient, apiUrl),
            };
            return acc;
          }, {} as AccumulatedCrudMethods),
        };
      }),
    );
  }
}
