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
  withHooks,
  withMethods
} from "@ngrx/signals";
import {
  addEntity,
  EntityId,
  type EntityProps,
  type EntityState,
  NamedEntityProps,
  NamedEntityState,
  withEntities
} from "@ngrx/signals/entities";
import { first, type Observable } from "rxjs";
import { type HttpOptions } from "./models";

type Entity = {
  id: EntityId;
};

export type CrudMethods = "get" | "getAll" | "pagedSearch" | "create" | "update" | "delete";

type CrudMethodReturn<
  MethodName extends CrudMethods,
  Method extends Function,
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  CollectionMethods extends boolean,
> = Omit<
  Builder<
    Type,
    AccumulatedFeature & {
      methods: Record<`_${MethodName}`, Method>;
    },
    [...Built, MethodName],
    Collection,
    CollectionMethods
  >,
  Built[number] | MethodName
>;

type EntitiesReturn<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  CollectionMethods extends boolean,
> = Omit<
  Builder<
    Type,
    Omit<AccumulatedFeature, "state" | "props"> & {
      state: EntityState<Type>;
      props: EntityProps<Type>;
    },
    [...Built, "entities", "namedEntities"],
    Collection,
    CollectionMethods
  >,
  Built[number] | "entities" | "namedEntities"
>;

type NamedEntitiesReturn<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends string[],
  Collection extends string,
  CollectionMethods extends boolean,
> = Omit<
  Builder<
    Type,
    Omit<AccumulatedFeature, "state" | "props"> & {
      state: NamedEntityState<Type, Collection>;
      props: NamedEntityProps<Type, Collection>;
    },
    [...Exclude<Built, "collectionMethods">, "namedEntities" | "entities"],
    Collection,
    CollectionMethods
  >,
  Exclude<Built[number], "collectionMethods"> | "namedEntities" | "entities"
>;

class Builder<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult = {
    state: object;
    props: object;
    methods: {};
  },
  Built extends string[] = ["collectionMethods"],
  Collection extends string = "",
  CollectionMethods extends boolean = false,
> {
  private readonly _get = (httpClient: HttpClient, apiUrl: string) => (id: string) =>
    httpClient.get<Type>(`${apiUrl}/${id}`, this.httpOptions).pipe(first());

  private readonly _create =
    <CreateType>(httpClient: HttpClient, apiUrl: string) =>
    (data: CreateType) =>
      httpClient.post<Type>(apiUrl, data, this.httpOptions).pipe(first());

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
    CollectionMethods
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _get: this._get,
    };

    return this as unknown as CrudMethodReturn<
      "get",
      (id: string) => Observable<Type>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      CollectionMethods
    >;
  }

  public create<CreateType = never>(): CrudMethodReturn<
    "create",
    (data: CreateType) => Observable<Type>,
    Type,
    AccumulatedFeature,
    Built,
    Collection,
    CollectionMethods
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      _create: this._create,
    };

    return this as unknown as CrudMethodReturn<
      "create",
      (data: CreateType) => Observable<Type>,
      Type,
      AccumulatedFeature,
      Built,
      Collection,
      CollectionMethods
    >;
  }

  private useEntities = false;

  entities(): EntitiesReturn<Type, AccumulatedFeature, Built, Collection, CollectionMethods> {
    this.useEntities = true;
    return this as EntitiesReturn<Type, AccumulatedFeature, Built, Collection, CollectionMethods>;
  }

  private useNamedEntities = false;
  private collection = "";

  namedEntities<const CollectionName extends string>(
    collection: CollectionName,
  ): Type extends Entity
    ? NamedEntitiesReturn<Type, AccumulatedFeature, Built, CollectionName, CollectionMethods>
    : never {
    this.useNamedEntities = true;
    this.collection = collection;

    return this as unknown as Type extends Entity
      ? NamedEntitiesReturn<Type, AccumulatedFeature, Built, CollectionName, CollectionMethods>
      : never;
  }

  private useCollectionMethods: true | false = false as const;

  collectionMethods(): Omit<
    Builder<Type, AccumulatedFeature, [...Built, "collectionMethods"], Collection, true>,
    Built[number] | "collectionMethods"
  > {
    this.useCollectionMethods = true as const;
    return this as Omit<
      Builder<Type, AccumulatedFeature, [...Built, "collectionMethods"], Collection, true>,
      Built[number] | "collectionMethods"
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
              const resolvedKey = this.useCollectionMethods
                ? key + this.collection.charAt(0).toUpperCase() + this.collection.slice(1)
                : key;
              acc = {
                ...acc,
                [resolvedKey]: value(httpClient, apiUrl),
              };
              return acc;
            },
            {} as CollectionMethods extends true
              ? CollectionCrudMethods<Collection, AccumulatedFeature["methods"]>
              : AccumulatedFeature["methods"],
          ),
        };
      }),
    ) as SignalStoreFeature<
      EmptyFeatureResult,
      Omit<AccumulatedFeature, "methods"> & {
        methods: CollectionMethods extends true
          ? CollectionCrudMethods<Collection, AccumulatedFeature["methods"]>
          : AccumulatedFeature["methods"];
      }
    >;
  }
}

type CollectionCrudMethods<Collection extends string, Methods extends Record<string, unknown>> = {
  [Key in string & keyof Methods as `${Key}${Capitalize<Collection>}`]: Methods[Key];
};

interface User {
  id: string;
}

export const ProtoProgressStore = signalStore(
  { providedIn: "root" },
  Builder.of<User>(() => "")
    .get()
    .create()
    .namedEntities("user")
    .collectionMethods()
    .build(),
  withHooks({
    onInit(store) {
      patchState(store, addEntity({ id: "1" }, { collection: "user" }));
    },
  }),
);
