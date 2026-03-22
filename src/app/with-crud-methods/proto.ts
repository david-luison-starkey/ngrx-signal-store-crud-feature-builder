import {
  type CallStateSignals,
  type CallStateSlice,
  type NamedCallStateSignals,
  type NamedCallStateSlice,
  setError,
  setLoading,
  updateState,
  withCallState
} from '@angular-architects/ngrx-toolkit';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  type EmptyFeatureResult,
  patchState,
  signalStore,
  type SignalStoreFeature,
  signalStoreFeature,
  type SignalStoreFeatureResult,
  type,
  withMethods,
  withState,
  type WritableStateSource
} from '@ngrx/signals';
import {
  addEntity,
  type EntityId,
  type EntityProps,
  type EntityState,
  type NamedEntityProps,
  type NamedEntityState,
  withEntities
} from '@ngrx/signals/entities';
import { type RxMethod, rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, first, Observable, pipe, switchMap, tap } from 'rxjs';
import { type Includes, type IsLowercase, type NonEmptyString } from 'type-fest';
import { type HttpClientParams, type HttpOptions, type PagedResponse } from './models';
import { _create, _delete, _get, _getAll, _pagedSearch, _update } from './crud-functions';

function noop() {}

export type NameConvention<Name extends string, Collection extends string> = Collection extends ""
  ? IsLowercase<Name> extends true
    ? NonEmptyString<Name>
    : never
  : Collection;

export type IncludesAny<StringArray extends string[], StringUnion extends string> = [
  StringUnion & StringArray[number],
] extends [never]
  ? false
  : true;

export type StateSliceSpecificCrudMethods<Built extends FluentBuilderMethods[]> =
  IncludesAny<Built, "state" | "namedState"> extends true
    ? Exclude<CrudMethods, "getAll" | "pagedSearch">
    : CrudMethods;

export type CollectionRequired<Built extends string[]> = IncludesAny<
  Built,
  "namedMethods" | "namedEntities" | "namedRequestStatus"
>;

export type FluentCrudBuilderMethodKeyMapper<
  Key extends CrudMethods,
  Built extends string[],
  Collection extends string = "",
> =
  Includes<Built, "public"> extends true
    ? Includes<Built, "namedMethods"> extends true
      ? `${Key}${Capitalize<Collection>}`
      : Key
    : Includes<Built, "private"> extends true
      ? Includes<Built, "namedMethods"> extends true
        ? `_${Key}${Capitalize<Collection>}`
        : `_${Key}`
      : never;

export type FluentCrudBuilderMethodKeyName<
  Key extends CrudMethods,
  Built extends string[],
  Collection extends string,
> =
  CollectionRequired<Built> extends true
    ? Collection extends ""
      ? never
      : FluentCrudBuilderMethodKeyMapper<Key, Built, Collection>
    : FluentCrudBuilderMethodKeyMapper<Key, Built>;

export type CrudMethods = "get" | "getAll" | "pagedSearch" | "create" | "update" | "delete";

export type CustomisationMethods =
  | "stateless"
  | "state"
  | "namedState"
  | "entities"
  | "namedEntities"
  | "namedMethods"
  | "public"
  | "private"
  | "rawMethods"
  | "patchState"
  | "devToolsAware"
  | "requestStatus"
  | "namedRequestStatus";

export type Build = "build";

export type FluentBuilderMethods = CustomisationMethods | CrudMethods | Build;

export type InitialExcluded = Exclude<FluentBuilderMethods, "private" | "public">;

export type Of<Type> = Omit<FluentCrudBuilder<Type>, InitialExcluded>;

export type PublicReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "public"],
    Exclude<
      Excluded | "public" | "private",
      "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities"
    >,
    Collection
  >,
  Exclude<
    Excluded | "public" | "private",
    "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities"
  >
>;

export type PrivateReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "private"],
    Exclude<
      Excluded | "public" | "private",
      "namedMethods" | "stateless" | "state" | "entities" | "namedEntities"
    >,
    Collection
  >,
  Exclude<
    Excluded | "public" | "private",
    "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities"
  >
>;

export type NamedMethodsReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "namedMethods"],
    Exclude<
      Excluded | "namedMethods",
      "stateless" | "state" | "namedState" | "entities" | "namedEntities"
    >,
    Collection
  >,
  Exclude<
    Excluded | "namedMethods",
    "stateless" | "state" | "namedState" | "entities" | "namedEntities"
  >
>;

export type CrudStateSlice<Type> = {
  data: Type | null;
};

export type StateReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature & {
      state: CrudStateSlice<Type>;
    },
    [...Built, "state"],
    Exclude<
      | Excluded
      | "namedMethods"
      | "stateless"
      | "state"
      | "namedState"
      | "entities"
      | "namedEntities",
      "rawMethods" | "patchState"
    >,
    Collection
  >,
  Exclude<
    Excluded | "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities",
    "rawMethods" | "patchState"
  >
>;

export type NamedCrudStateSlice<Type, Name extends string> = {
  [Key in keyof CrudStateSlice<Type> as Name extends ""
    ? `${Name}${Key}`
    : `${Name}${Capitalize<Key>}`]: CrudStateSlice<Type>[Key];
};

export type NamedStateReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature & {
      state: NamedCrudStateSlice<Type, Collection>;
    },
    [...Built, "namedState"],
    Exclude<
      | Excluded
      | "namedMethods"
      | "stateless"
      | "state"
      | "namedState"
      | "entities"
      | "namedEntities",
      "rawMethods" | "patchState"
    >,
    Collection
  >,
  Exclude<
    Excluded | "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities",
    "rawMethods" | "patchState"
  >
>;

export type StatelessReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "stateless"],
    Exclude<
      | Excluded
      | "namedMethods"
      | "stateless"
      | "state"
      | "namedState"
      | "entities"
      | "namedEntities",
      CrudMethods
    >,
    Collection
  >,
  Exclude<
    Excluded | "namedMethods" | "stateless" | "state" | "namedState" | "entities" | "namedEntities",
    CrudMethods
  >
>;

export type Entity = {
  id: EntityId;
};

export type EntitiesReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Type extends Entity
  ? Omit<
      FluentCrudBuilder<
        Type,
        AccumulatedFeature & {
          state: EntityState<Type>;
          props: EntityProps<Type>;
        },
        [...Built, "entities"],
        Exclude<
          | Excluded
          | "namedMethods"
          | "stateless"
          | "state"
          | "namedState"
          | "entities"
          | "namedEntities",
          "rawMethods" | "patchState"
        >,
        Collection
      >,
      Exclude<
        | Excluded
        | "namedMethods "
        | "stateless"
        | "state"
        | "namedState"
        | "entities"
        | "namedEntities",
        "rawMethods" | "patchState"
      >
    >
  : never;

export type NamedEntitiesReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Type extends Entity
  ? Omit<
      FluentCrudBuilder<
        Type,
        AccumulatedFeature & {
          state: NamedEntityState<Type, Collection>;
          props: NamedEntityProps<Type, Collection>;
        },
        [...Built, "namedEntities"],
        Exclude<
          | Excluded
          | "namedMethods"
          | "stateless"
          | "state"
          | "namedState"
          | "entities"
          | "namedEntities",
          "rawMethods" | "patchState"
        >,
        Collection
      >,
      Exclude<
        | Excluded
        | "namedMethods"
        | "stateless"
        | "state"
        | "namedState"
        | "entities"
        | "namedEntities",
        "rawMethods" | "patchState"
      >
    >
  : never;

export type RawMethodsReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "rawMethods"],
    Exclude<Excluded | "rawMethods" | "patchState", StateSliceSpecificCrudMethods<Built>>,
    Collection
  >,
  Exclude<Excluded | "rawMethods" | "patchState", StateSliceSpecificCrudMethods<Built>>
>;

export type PatchStateReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "patchState"],
    Exclude<
      Excluded | "patchState" | "rawMethods",
      | "devToolsAware"
      | "requestStatus"
      | "namedRequestStatus"
      | StateSliceSpecificCrudMethods<Built>
    >,
    Collection
  >,
  Exclude<
    Excluded | "patchState" | "rawMethods",
    "devToolsAware" | "requestStatus" | "namedRequestStatus" | StateSliceSpecificCrudMethods<Built>
  >
>;

export type DevToolsAwareReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature,
    [...Built, "devToolsAware"],
    Exclude<
      Excluded | "devToolsAware",
      "requestStatus" | "namedRequestStatus" | StateSliceSpecificCrudMethods<Built>
    >,
    Collection
  >,
  Exclude<
    Excluded | "devToolsAware",
    "requestStatus" | "namedRequestStatus" | StateSliceSpecificCrudMethods<Built>
  >
>;

export type RequestStatusReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature & { state: CallStateSlice; props: CallStateSignals },
    [...Built, "requestStatus"],
    Exclude<
      Excluded | "requestStatus" | "namedRequestStatus" | "devToolsAware",
      StateSliceSpecificCrudMethods<Built>
    >,
    Collection
  >,
  Exclude<
    Excluded | "requestStatus" | "namedRequestStatus" | "devToolsAware",
    StateSliceSpecificCrudMethods<Built>
  >
>;

export type NamedRequestStatusReturnType<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature & {
      state: AccumulatedFeature["state"] & NamedCallStateSlice<Collection>;
      props: NamedCallStateSignals<Collection>;
    },
    [...Built, "namedRequestStatus"],
    Exclude<
      Excluded | "requestStatus" | "namedRequestStatus" | "devToolsAware",
      StateSliceSpecificCrudMethods<Built>
    >,
    Collection
  >,
  Exclude<
    Excluded | "requestStatus" | "namedRequestStatus" | "devToolsAware",
    StateSliceSpecificCrudMethods<Built>
  >
>;

export type CrudMethodReturnType<
  CrudMethod extends CrudMethods,
  MethodName extends string,
  MethodSignature,
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult,
  Built extends FluentBuilderMethods[],
  Excluded extends FluentBuilderMethods,
  Collection extends string,
> = Omit<
  FluentCrudBuilder<
    Type,
    AccumulatedFeature & {
      methods: Record<MethodName, MethodSignature>;
    },
    [...Built, CrudMethod],
    Exclude<Excluded | CrudMethod | CustomisationMethods, Build>,
    Collection
  >,
  Exclude<Excluded | CrudMethod | CustomisationMethods, Build>
>;

export type GetObservable<Type> = (id: string) => Observable<Type>;

export type GetRxMethod = RxMethod<string>;

export type GetAllObservable<Type> = () => Observable<Type[]>;

export type GetAllRxMethod = RxMethod<void>;

export type PagedSearchObservable<Type> = (
  searchParams: HttpClientParams,
) => Observable<PagedResponse<Type>>;

export type PagedSearchRxMethod = RxMethod<HttpClientParams>;

export type CreateObservable<Type, CreateType> = (data: CreateType) => Observable<Type>;

export type CreateRxMethod<CreateType> = RxMethod<CreateType>;

export type UpdateObservable<Type, UpdateType> = (id: string, data: UpdateType) => Observable<Type>;

export type UpdateRxMethod<UpdateType> = RxMethod<{
  id: string;
  data: UpdateType;
}>;

export type DeleteObservable = (id: string) => Observable<void>;

export type DeleteRxMethod = RxMethod<string>;

export type CrudMethodSignature<
  ObservableSignature extends (...args: any[]) => Observable<any>,
  RxMethodSignature extends RxMethod<any>,
  Built extends FluentBuilderMethods[],
> =
  IncludesAny<Built, "stateless" | "rawMethods"> extends true
    ? ObservableSignature
    : Includes<Built, "patchState"> extends true
      ? RxMethodSignature
      : never;

class FluentCrudBuilder<
  Type,
  AccumulatedFeature extends SignalStoreFeatureResult = {
    state: object;
    props: object;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    methods: {};
  },
  Built extends FluentBuilderMethods[] = [],
  Excluded extends FluentBuilderMethods = InitialExcluded,
  Collection extends string = "",
> {
  private useStateType: "stateless" | "state" | "namedState" | "entities" | "namedEntities" | null =
    null;
  private namedStateName: string | null = null;
  private namedEntitiesName: string | null = null;
  private useNamedMethods = false;
  private namedMethodsName: string | null = null;
  private useAccessModifier: "public" | "private" | null = null;
  private useMethodBehaviour: "raw" | "patch" | null = null;
  private useDevToolsAware = false;
  private devToolsActionPrefix: `[${Capitalize<string>}]` | null = null;
  private useRequestStatus = false;
  private useNamedRequestStatus = false;
  private namedRequestStatusName: string | null = null;

  private getNamedStateKey() {
    return `${this.namedStateName}Data`;
  }

  private crudMethodFactory(methodType: CrudMethods) {
    if (this.useMethodBehaviour === "raw") {
      switch (methodType) {
        case "get":
          return _get;
        case "getAll":
          return _getAll;
        case "pagedSearch":
          return _pagedSearch;
        case "create":
          return _create;
        case "update":
          return _update;
        case "delete":
          return _delete;
      }
    }

    if (this.useRequestStatus || this.useNamedRequestStatus) {
      return <Type extends Entity>(
        httpClient: HttpClient,
        apiUrl: string,
        httpOptions: HttpOptions,
        store: WritableStateSource<any>,
      ) =>
        rxMethod<string>(
          pipe(
            tap(() =>
              this.useRequestStatus || this.useNamedRequestStatus
                ? this.useDevToolsAware
                  ? updateState(
                      store,
                      `${this.devToolsActionPrefix!} loading`,
                      this.useRequestStatus
                        ? setLoading()
                        : setLoading(this.namedRequestStatusName!),
                    )
                  : patchState(
                      store,
                      this.useRequestStatus
                        ? setLoading()
                        : setLoading(this.namedRequestStatusName!),
                    )
                : noop(),
            ),
            switchMap((id: string) => {
              switch (methodType) {
                case "get":
                  return _get(httpClient, apiUrl, httpOptions)<Type>(id);
                default:
                  return httpClient.get<Type>(`${apiUrl}/${id}`, httpOptions).pipe(first());
              }
            }),
            tap((data: Type) => {
              if (this.useDevToolsAware) {
                updateState(
                  store,
                  `${this.devToolsActionPrefix!} loaded`,
                  this.useStateType === "entities"
                    ? addEntity(data)
                    : this.useStateType === "namedEntities"
                      ? addEntity(data, { collection: this.namedEntitiesName! })
                      : this.useStateType === "state"
                        ? () => ({ data })
                        : () => ({ [this.getNamedStateKey()]: data }),
                );
              } else {
                patchState(
                  store,
                  this.useStateType === "entities"
                    ? addEntity(data)
                    : this.useStateType === "namedEntities"
                      ? addEntity(data, { collection: this.namedEntitiesName! })
                      : this.useStateType === "state"
                        ? () => ({ data })
                        : () => ({ [this.getNamedStateKey()]: data }),
                );

                if (this.useRequestStatus || this.useNamedRequestStatus) {
                  if (this.useDevToolsAware) {
                    updateState(
                      store,
                      `${this.devToolsActionPrefix!} loaded`,
                      this.useRequestStatus
                        ? setLoading()
                        : setLoading(this.namedRequestStatusName!),
                    );
                  } else {
                    patchState(
                      store,
                      this.useRequestStatus
                        ? setLoading()
                        : setLoading(this.namedRequestStatusName!),
                    );
                  }
                }
              }
            }),
            catchError((error: unknown) => {
              if (this.useRequestStatus || this.namedRequestStatusName) {
                if (this.useDevToolsAware) {
                  updateState(
                    store,
                    `${this.devToolsActionPrefix!} error`,
                    this.useRequestStatus
                      ? setError(error)
                      : setError(error, this.namedRequestStatusName!),
                  );
                } else {
                  patchState(
                    store,
                    this.useRequestStatus
                      ? setError(error)
                      : setError(error, this.namedRequestStatusName!),
                  );
                }
              }
              return EMPTY;
            }),
          ),
        );
    } else {
      return (
        httpClient: HttpClient,
        apiUrl: string,
        httpOptions: HttpOptions,
        store: WritableStateSource<any>,
      ) =>
        rxMethod<string>(
          pipe(
            switchMap((id: string) =>
              httpClient.get<Type & Entity>(`${apiUrl}/${id}`, httpOptions).pipe(first()),
            ),
            tap((data: Type & Entity) => {
              if (this.useDevToolsAware) {
                updateState(
                  store,
                  this.devToolsActionPrefix!,
                  this.useStateType === "entities"
                    ? addEntity(data)
                    : addEntity(data, { collection: this.namedEntitiesName! }),
                );
              } else {
                patchState(
                  store,
                  this.useStateType === "entities"
                    ? addEntity(data)
                    : addEntity(data, { collection: this.namedEntitiesName! }),
                );
              }
            }),
            catchError((error: unknown) => {
              if (this.useDevToolsAware) {
                updateState(store, this.devToolsActionPrefix!, setError(error));
              } else {
                patchState(store, setError(error));
              }
              return EMPTY;
            }),
          ),
        );
    }
  }

  constructor(
    private readonly apiUrlFactory: () => string,
    private readonly httpOptions: Partial<HttpOptions>,
    private accumulatedCrudFeatureMethods: AccumulatedFeature["methods"],
  ) {}

  public static of<Type>(
    apiUrlFactory: () => string,
    httpOptions?: Partial<HttpOptions>,
  ): Of<Type> {
    return new FluentCrudBuilder<Type>(
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

  public(): PublicReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useAccessModifier = "public";
    return this as never;
  }

  private(): PrivateReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useAccessModifier = "private";
    return this as never;
  }

  namedMethods<const Name extends string>(
    name: NameConvention<Name, Collection>,
  ): NamedMethodsReturnType<
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    NameConvention<Name, Collection>
  > {
    this.useNamedMethods = true;
    this.namedMethodsName = name;
    return this as never;
  }

  stateless(): StatelessReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useStateType = "stateless";
    this.useMethodBehaviour = "raw";
    return this as never;
  }

  state(): StateReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useStateType = "state";
    return this as never;
  }

  namedState<const Name extends string>(
    name: NameConvention<Name, Collection>,
  ): NamedStateReturnType<
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    NameConvention<Name, Collection>
  > {
    this.useStateType = "namedState";
    this.namedStateName = name;
    return this as never;
  }

  entities(): EntitiesReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useStateType = "entities";
    return this as never;
  }

  namedEntities<const Name extends string>(
    name: NameConvention<Name, Collection>,
  ): NamedEntitiesReturnType<
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    NameConvention<Name, Collection>
  > {
    this.useStateType = "namedEntities";
    this.namedEntitiesName = name;
    return this as never;
  }

  rawMethods(): RawMethodsReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useMethodBehaviour = "raw";
    return this as never;
  }

  patchState(): PatchStateReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useMethodBehaviour = "patch";
    return this as never;
  }

  devToolsAware<const Action extends string>(
    name: `[${Capitalize<NameConvention<Action, Collection>>}]`,
  ): DevToolsAwareReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useDevToolsAware = true;
    this.devToolsActionPrefix = name;
    return this as never;
  }

  requestStatus(): RequestStatusReturnType<Type, AccumulatedFeature, Built, Excluded, Collection> {
    this.useRequestStatus = true;
    return this as never;
  }

  namedRequestStatus<const Name extends string>(
    name: NameConvention<Name, Collection>,
  ): NamedRequestStatusReturnType<
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    NameConvention<Name, Collection>
  > {
    this.useNamedRequestStatus = true;
    this.namedRequestStatusName = name;
    return this as never;
  }

  private getCrudMethodName(methodName: CrudMethods): string {
    const accessModifierKey = this.useAccessModifier === "public" ? methodName : `_${methodName}`;
    return this.useNamedMethods
      ? accessModifierKey +
          this.namedMethodsName?.charAt(0).toUpperCase() +
          this.namedMethodsName?.slice(1)
      : accessModifierKey;
  }

  get(): CrudMethodReturnType<
    "get",
    FluentCrudBuilderMethodKeyName<"get", Built, Collection>,
    CrudMethodSignature<GetObservable<Type>, GetRxMethod, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("get")]: this.crudMethodFactory("get"),
    };
    return this as never;
  }

  getAll(): CrudMethodReturnType<
    "getAll",
    FluentCrudBuilderMethodKeyName<"getAll", Built, Collection>,
    CrudMethodSignature<GetAllObservable<Type>, GetAllRxMethod, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("getAll")]: this.crudMethodFactory("getAll"),
    };

    return this as never;
  }

  pagedSearch(): CrudMethodReturnType<
    "pagedSearch",
    FluentCrudBuilderMethodKeyName<"pagedSearch", Built, Collection>,
    CrudMethodSignature<PagedSearchObservable<Type>, PagedSearchRxMethod, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("pagedSearch")]: this.crudMethodFactory("pagedSearch"),
    };

    return this as never;
  }

  create<CreateType = Omit<Type, "id">>(): CrudMethodReturnType<
    "create",
    FluentCrudBuilderMethodKeyName<"create", Built, Collection>,
    CrudMethodSignature<CreateObservable<Type, CreateType>, CreateRxMethod<CreateType>, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("create")]: this.crudMethodFactory("create"),
    };
    return this as never;
  }

  update<UpdateType = Partial<Type>>(): CrudMethodReturnType<
    "update",
    FluentCrudBuilderMethodKeyName<"update", Built, Collection>,
    CrudMethodSignature<UpdateObservable<Type, UpdateType>, UpdateRxMethod<UpdateType>, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("update")]: this.crudMethodFactory("update"),
    };
    return this as never;
  }

  delete(): CrudMethodReturnType<
    "delete",
    FluentCrudBuilderMethodKeyName<"delete", Built, Collection>,
    CrudMethodSignature<DeleteObservable, DeleteRxMethod, Built>,
    Type,
    AccumulatedFeature,
    Built,
    Excluded,
    Collection
  > {
    this.accumulatedCrudFeatureMethods = {
      ...this.accumulatedCrudFeatureMethods,
      [this.getCrudMethodName("delete")]: this.crudMethodFactory("delete"),
    };
    return this as never;
  }

  build(): SignalStoreFeature<EmptyFeatureResult, AccumulatedFeature> {
    return signalStoreFeature(
      this.useStateType === "state"
        ? withState<CrudStateSlice<Type>>({ data: null })
        : this.useStateType === "namedState"
          ? withState<NamedCrudStateSlice<Type, Collection>>({
              [this.getNamedStateKey()]: null,
            } as NamedCrudStateSlice<Type, Collection>)
          : this.useStateType === "entities"
            ? withEntities<Type>()
            : this.useStateType === "namedEntities"
              ? withEntities({
                  entity: type<Type>(),
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  collection: this.namedEntitiesName!,
                })
              : {},
      this.useRequestStatus
        ? withCallState()
        : this.useNamedRequestStatus
          ? withCallState({ collection: this.namedRequestStatusName! })
          : withState({}),
      withMethods((store, httpClient = inject(HttpClient)) => {
        // Strip leading and trailing forward slashes.
        const apiUrl = this.apiUrlFactory().replace(/^\/+|\/+$/g, "");

        return {
          ...Object.entries(this.accumulatedCrudFeatureMethods).reduce(
            (acc, [key, value]) => {
              acc = {
                ...acc,
                [key]:
                  this.useMethodBehaviour === "patch"
                    ? value(httpClient, apiUrl, this.httpOptions, store)
                    : value(httpClient, apiUrl, this.httpOptions),
              };
              return acc;
            },
            {} as AccumulatedFeature["methods"],
          ),
        };
      }),
    ) as SignalStoreFeature<EmptyFeatureResult, AccumulatedFeature>;
  }
}

export function withFluentCrud<Type = never>(
  apiUrlFactory: () => string,
  httpOptions?: Partial<HttpOptions>,
): Of<Type> {
  return FluentCrudBuilder.of<Type>(apiUrlFactory, httpOptions);
}

interface User {
  ids: string;
}

export const ProtoStore = signalStore(
  FluentCrudBuilder.of<User>(() => "")
    .public()
    .namedMethods("user")
    .namedState("user")
    .patchState()
    .devToolsAware("[User]")
    .namedRequestStatus("user")
    .update()
    .build(),
);

class Testing {
  store = inject(ProtoStore);

  constructor() {}
}
