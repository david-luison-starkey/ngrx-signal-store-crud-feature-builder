import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject } from "@angular/core";
import {
  type EmptyFeatureResult,
  patchState,
  signalStore,
  type SignalStoreFeature,
  signalStoreFeature,
  type SignalStoreFeatureResult,
  type,
  withMethods,
  WritableStateSource
} from "@ngrx/signals";
import {
  addEntity,
  type EntityProps,
  type EntityState,
  NamedEntityProps,
  NamedEntityState,
  withEntities
} from "@ngrx/signals/entities";
import { type Observable, pipe, switchMap, tap } from "rxjs";
import {
  CollectionCrudMethods,
  type DeriveConsistentCollectionAndMethodName,
  type Entity,
  type HttpOptions,
  PagedResponse
} from "./models";
import { updateState, withDevtools } from "@angular-architects/ngrx-toolkit";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { _create, _delete, _get, _getAll, _pagedSearch, _update } from "./crud-functions";

export type CrudMethods = "get" | "getAll" | "pagedSearch" | "create" | "update" | "delete";

type CrudMethodReturn<
  MethodName extends CrudMethods,
  Method extends Function,
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  NamedMethodsName extends string,
> = Omit<
  Builder<
    Type,
    AccumulatedFeature & {
      methods: Record<`_${MethodName}`, Method>;
    },
    [...Built, MethodName],
    Collection,
    NamedMethodsName
  >,
  Built[number] | MethodName
>;

type EntitiesReturn<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  NamedMethodsName extends string,
> = Omit<
  Builder<
    Type,
    Omit<AccumulatedFeature, "state" | "props"> & {
      state: EntityState<Type>;
      props: EntityProps<Type>;
    },
    [...Built, "entities", "namedEntities"],
    Collection,
    NamedMethodsName
  >,
  Built[number] | "entities" | "namedEntities"
>;

type NamedEntitiesReturn<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  NamedMethodsName extends string,
> = Omit<
  Builder<
    Type,
    Omit<AccumulatedFeature, "state" | "props"> & {
      state: NamedEntityState<Type, Collection>;
      props: NamedEntityProps<Type, Collection>;
    },
    [...Built, "namedEntities" | "entities"],
    Collection,
    NamedMethodsName
  >,
  Built[number] | "namedEntities" | "entities"
>;

const _getAndUpdateState =
  (
    httpClient: HttpClient,
    apiUrl: string,
    httpOptions: HttpOptions,
    store: WritableStateSource<any>,
    withCollection: boolean,
    collection: string = "",
    withDevTools: boolean,
    devToolsName: string = "",
  ) =>
  <Type extends Entity>() =>
    rxMethod<string>(
      pipe(
        switchMap((id) => _get(httpClient, apiUrl, httpOptions)<Type>(id)),
        tap((response) => {
          withDevTools
            ? updateState(
                store,
                devToolsName,
                withCollection ? addEntity(response, { collection }) : addEntity(response),
              )
            : patchState(
                store,
                withCollection ? addEntity(response, { collection }) : addEntity(response),
              );
        }),
      ),
    );

class Builder<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult = {
    state: object;
    props: object;
    methods: {};
  },
  Built extends string[] = [],
  Collection extends string = "",
  NamedMethodsName extends string = "",
> {
  constructor(
    private readonly apiUrlFactory: () => string,
    private readonly httpOptions: Partial<HttpOptions>,
    private accumulatedCrudFeatureMethods: AccumulatedFeature["methods"],
  ) {}

  public static of<Type>(
    apiUrlFactory: () => string,
    httpOptions?: Partial<HttpOptions>,
  ): Builder<Type> {
    return new Builder<Type>(
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

  public get(): CrudMethodReturn<
    "get",
    (id: string) => Observable<Type>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _get,
    };

    return this as unknown as CrudMethodReturn<
      "get",
      (id: string) => Observable<Type>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  public getAll(): CrudMethodReturn<
    "getAll",
    () => Observable<Type[]>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _getAll,
    };

    return this as unknown as CrudMethodReturn<
      "getAll",
      () => Observable<Type[]>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  public pagedSearch(): CrudMethodReturn<
    "pagedSearch",
    () => Observable<PagedResponse<Type>>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _pagedSearch,
    };

    return this as unknown as CrudMethodReturn<
      "pagedSearch",
      () => Observable<PagedResponse<Type>>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  public create<CreateType = Omit<Type, "id">>(): CrudMethodReturn<
    "create",
    (data: CreateType) => Observable<Type>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _create,
    };

    return this as unknown as CrudMethodReturn<
      "create",
      (data: CreateType) => Observable<Type>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  public update<UpdateType = Partial<Type>>(): CrudMethodReturn<
    "update",
    (id: string, data: UpdateType) => Observable<Type>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _update,
    };

    return this as unknown as CrudMethodReturn<
      "update",
      (id: string, data: UpdateType) => Observable<Type>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  public delete(): CrudMethodReturn<
    "delete",
    (id: string) => Observable<void>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    NamedMethodsName
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _delete,
    };

    return this as unknown as CrudMethodReturn<
      "delete",
      (id: string) => Observable<void>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      NamedMethodsName
    >;
  }

  private useEntities = false;

  entities(): EntitiesReturn<Type, AccumulatedFeature, Built, Collection, NamedMethodsName> {
    this.useEntities = true;
    return this as EntitiesReturn<Type, AccumulatedFeature, Built, Collection, NamedMethodsName>;
  }

  private useNamedEntities = false;
  private collection = "";

  namedEntities<const CollectionName extends string>(
    collection: DeriveConsistentCollectionAndMethodName<CollectionName, NamedMethodsName>,
  ): Type extends Entity
    ? NamedEntitiesReturn<Type, AccumulatedFeature, Built, CollectionName, NamedMethodsName>
    : never {
    this.useNamedEntities = true;
    this.collection = collection;

    return this as unknown as Type extends Entity
      ? NamedEntitiesReturn<Type, AccumulatedFeature, Built, CollectionName, NamedMethodsName>
      : never;
  }

  private useNamedMethods = false;
  private methodName = "";

  namedMethods<const NamedMethod extends string>(
    name: DeriveConsistentCollectionAndMethodName<NamedMethod, Collection>,
  ): Omit<
    Builder<Type, AccumulatedFeature, [...Built, "namedMethods"], Collection, NamedMethod>,
    Built[number] | "namedMethods"
  > {
    this.useNamedMethods = true;
    this.methodName = name;

    return this as unknown as Omit<
      Builder<Type, AccumulatedFeature, [...Built, "namedMethods"], Collection, NamedMethod>,
      Built[number] | "namedMethods"
    >;
  }

  build() {
    return signalStoreFeature(
      this.useEntities
        ? withEntities<Type>()
        : this.useNamedEntities
          ? withEntities({ entity: type<Type>(), collection: this.collection })
          : {},
      withMethods((_, httpClient = inject(HttpClient)) => {
        // Strip leading and trailing forward slashes.
        const apiUrl = this.apiUrlFactory().replace(/^\/+|\/+$/g, "");

        return {
          ...Object.entries(this.accumulatedCrudFeatureMethods).reduce(
            (acc, [key, value]) => {
              const resolvedKey = this.useNamedMethods
                ? key + this.methodName.charAt(0).toUpperCase() + this.methodName.slice(1)
                : key;
              acc = {
                ...acc,
                [resolvedKey]: value(httpClient, apiUrl, this.httpOptions),
              };
              return acc;
            },
            {} as NamedMethodsName extends ""
              ? AccumulatedFeature["methods"]
              : CollectionCrudMethods<NamedMethodsName, AccumulatedFeature["methods"]>,
          ),
        };
      }),
    ) as SignalStoreFeature<
      EmptyFeatureResult,
      Omit<AccumulatedFeature, "methods"> & {
        methods: NamedMethodsName extends ""
          ? AccumulatedFeature["methods"]
          : CollectionCrudMethods<NamedMethodsName, AccumulatedFeature["methods"]>;
      }
    >;
  }
}

interface User {
  id: string;
}

export const ProtoProgressStore = signalStore(
  { providedIn: "root" },
  Builder.of<User>(() => "")
    .get()
    .namedMethods("user")
    .namedEntities("user")
    .getAll()
    .pagedSearch()
    .create()
    .update()
    .delete()
    .build(),
  withDevtools("Users"),
  withMethods((store) => ({
    add: rxMethod<void>(pipe(tap(() => {}))),
  })),
);
