# NgrxSignalStoreCrudFeatureBuilder

Inspired by [Ngrx SignalStoreFeature Conditional](https://github.com/michael-small/ngrx-signal-store-feature-conditional) ([and the live walkthrough](https://www.youtube.com/watch?v=1D8VTlTnJ2E)). This project contains an NgRx Signal Store feature, `withCrudMethods`, that affords an incremental, declarative, and type-safe way (I think) to expose common http methods to a signal store, using the builder pattern.

# Local setup 

This is a basic Angular project, so any runtime experimentation will require adding more code.

That said, `src/app/app.ts` contains some basic usage to get a sense of the look and feel of `withCrudMethods`:

```ts
interface User {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
}

const Store = signalStore(
  withState({}),
  withCrudMethods<User>(() => "/api/v1/users/")
    .get()
    .getAll()
    .pagedSearch()
    .create<Omit<User, "id">>()
    .update<Partial<User>>()
    .delete()
    .build(),
  withMethods((store) => ({
    createUser: rxMethod<Omit<User, "id">>(pipe(switchMap((user) => store._create(user)))),
    getUser: rxMethod<string>(
      pipe(
        switchMap((id) => store._get(id)),
        tap((user) => {
          patchState(store, { ...user });
        }),
      ),
    ),
  })),
);
```

# Tests

The feature does have some simple unit tests.

Execute with `vitest` via:

```shell
ng test
```
