import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { inject, InjectionToken } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchMap, tap } from "rxjs";
import { withCrudMethods } from "./feature";
import { type HttpClientParams } from "./models";

describe("Crud Methods Builder", () => {
  it("should execute apiUrlFactory callback in an injection context", () => {
    const BASE_DOMAIN_URL = new InjectionToken("Base API URL string");
    const SUB_DOMAIN_URL = new InjectionToken("Sub domain API URL string");

    const Store = signalStore(
      withState({}),
      withCrudMethods<User>(() => `${inject(BASE_DOMAIN_URL)}${inject(SUB_DOMAIN_URL)}/endpoint`)
        .get()
        .delete()
        .build(),
      withMethods((store) => ({
        getUser: rxMethod<string>(pipe(switchMap((id) => store._get(id)))),
        deleteUser: rxMethod<string>(pipe(switchMap((id) => store._delete(id)))),
      })),
      withHooks((store) => ({
        onInit() {
          store.getUser("1");
          store.deleteUser("1");
        },
      })),
    );

    TestBed.configureTestingModule({
      providers: [
        Store,
        {
          provide: BASE_DOMAIN_URL,
          useValue: "https://base-domain",
        },
        {
          provide: SUB_DOMAIN_URL,
          useValue: "/sub-domain",
        },
      ],
    });

    expect(() => TestBed.inject(Store)).not.toThrowError();
  });

  describe("Signal Store integration", () => {
    it("should expose all methods available when built via the builder", () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState({}),
          withCrudMethods<User>(usersApiUrlFactory)
            .get()
            .getAll()
            .pagedSearch()
            .create<CreateUser>()
            .update<UpdateUser>()
            .delete()
            .build(),
        );
        const store = new Store();

        expect(Object.hasOwn(store, "_get")).toBe(true);
        expect(typeof (store as any)._get).toBe("function");
        expect(Object.hasOwn(store, "_getAll")).toBe(true);
        expect(typeof (store as any)._getAll).toBe("function");
        expect(Object.hasOwn(store, "_pagedSearch")).toBe(true);
        expect(typeof (store as any)._pagedSearch).toBe("function");
        expect(Object.hasOwn(store, "_create")).toBe(true);
        expect(typeof (store as any)._create).toBe("function");
        expect(Object.hasOwn(store, "_delete")).toBe(true);
        expect(typeof (store as any)._delete).toBe("function");
        expect(Object.hasOwn(store, "_update")).toBe(true);
        expect(typeof (store as any)._update).toBe("function");
        expect(Object.getOwnPropertyNames(store)).toHaveLength(6);
      });
    });

    it("should only expose methods built via the builder", () => {
      TestBed.runInInjectionContext(() => {
        const ExposedMethodsStore = signalStore(
          withState({}),
          withCrudMethods<User>(usersApiUrlFactory).get().create<CreateUser>().build(),
        );
        const store = new ExposedMethodsStore();

        expect(Object.hasOwn(store, "_get")).toBe(true);
        expect(Object.hasOwn(store, "_create")).toBe(true);
        expect(typeof (store as any)._get).toBe("function");
        expect(typeof (store as any)._create).toBe("function");
        expect(Object.hasOwn(store, "_getAll")).toBe(false);
        expect(Object.hasOwn(store, "_delete")).toBe(false);
        expect(Object.hasOwn(store, "_update")).toBe(false);
        expect(Object.getOwnPropertyNames(store)).toHaveLength(2);
      });
    });

    it("should be composable with other features", () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState<UserState>({ users: [] }),
          withCrudMethods<User>(usersApiUrlFactory)
            .get()
            .getAll()
            .create<CreateUser>()
            .update<UpdateUser>()
            .delete()
            .build(),
          withMethods((store) => ({
            getUsers: rxMethod<void>(
              pipe(
                switchMap(() => store._getAll()),
                tap((users) => patchState(store, { users: [...users] })),
              ),
            ),
          })),
          withComputed((store) => ({
            adults: () => store.users().filter((user) => user.age >= 18),
          })),
          withHooks((store) => ({
            onInit() {
              store.getUsers();
            },
          })),
        );
        const store = new Store();

        expect(store).toBeDefined();
      });
    });
  });

  describe("Http method functionality", () => {
    it.each([
      () => leadingForwardSlashApiUrl,
      () => trailingForwardSlashApiUrl,
      () => leadingAndTrailingForwardSlashApiUrl,
    ])("_get", (apiUrl) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).get().build(),
        withMethods((store) => ({
          getUser: rxMethod<string>(pipe(switchMap((id: string) => store._get(id)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.getUser(randomId);

      const req = httpTesting.expectOne(
        `${normalisedApiUrl}/${randomId}`,
        "Request to retrieve a user by id",
      );

      expect(req.request.method).toBe("GET");
      req.flush({});
      httpTesting.verify();
    });

    it.each([
      () => leadingForwardSlashApiUrl,
      () => trailingForwardSlashApiUrl,
      () => leadingAndTrailingForwardSlashApiUrl,
    ])("_getAll", (apiUrl) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).getAll().build(),
        withMethods((store) => ({
          getUsers: rxMethod<void>(pipe(switchMap(() => store._getAll()))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.getUsers();

      const req = httpTesting.expectOne(normalisedApiUrl, "Request to retrieve all users");

      expect(req.request.method).toBe("GET");
      req.flush({});
      httpTesting.verify();
    });

    it.each([
      {
        apiUrl: () => leadingForwardSlashApiUrl,
        searchQuery: { name: "Daz" },
        expectedSearchQuery: "?name=Daz",
      },
      {
        apiUrl: () => trailingForwardSlashApiUrl,
        searchQuery: { age: 343 },
        expectedSearchQuery: "?age=343",
      },
      {
        apiUrl: () => leadingAndTrailingForwardSlashApiUrl,
        searchQuery: { name: "Mi", age: 34 },
        expectedSearchQuery: "?name=Mi&age=34",
      },
    ])("_pagedSearch", ({ apiUrl, searchQuery, expectedSearchQuery }) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).pagedSearch().build(),
        withMethods((store) => ({
          search: rxMethod<HttpClientParams>(pipe(switchMap((query) => store._pagedSearch(query)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.search(searchQuery as HttpClientParams);

      const req = httpTesting.expectOne(
        `${normalisedApiUrl}${expectedSearchQuery}`,
        "Request to search for users by query",
      );

      expect(req.request.method).toBe("GET");
      req.flush({});
      httpTesting.verify();
    });

    it.each([
      {
        apiUrl: () => leadingForwardSlashApiUrl,
        user: { name: "Sheila", age: 34 },
      },
      {
        apiUrl: () => trailingForwardSlashApiUrl,
        user: { name: "Daren", age: 83 },
      },
      {
        apiUrl: () => leadingAndTrailingForwardSlashApiUrl,
        user: { name: "Bruce", age: 45 },
      },
    ])("_create", ({ apiUrl, user }) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).create<CreateUser>().build(),
        withMethods((store) => ({
          createUser: rxMethod<CreateUser>(pipe(switchMap((user) => store._create(user)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.createUser(user);

      const req = httpTesting.expectOne(normalisedApiUrl, "Request to create a user");

      expect(req.request.method).toBe("POST");
      req.flush({});
      httpTesting.verify();
    });

    it.each([
      {
        apiUrl: () => leadingForwardSlashApiUrl,
        user: { name: "Sheila", age: 34 },
      },
      {
        apiUrl: () => trailingForwardSlashApiUrl,
        user: { age: 83 },
      },
      {
        apiUrl: () => leadingAndTrailingForwardSlashApiUrl,
        user: { name: "Bruce", age: 45 },
      },
    ])("_update", ({ apiUrl, user }) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).update<UpdateUser>().build(),
        withMethods((store) => ({
          updateUser: rxMethod<{ id: string; user: UpdateUser }>(
            pipe(switchMap(({ id, user }) => store._update(id, user))),
          ),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.updateUser({
        id: randomId,
        user,
      });

      const req = httpTesting.expectOne(
        `${normalisedApiUrl}/${randomId}`,
        "Request to update an existing user",
      );

      expect(req.request.method).toBe("PUT");
      req.flush({});
      httpTesting.verify();
    });

    it.each([
      () => leadingForwardSlashApiUrl,
      () => trailingForwardSlashApiUrl,
      () => leadingAndTrailingForwardSlashApiUrl,
    ])("_delete", (apiUrl) => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(apiUrl).delete().build(),
        withMethods((store) => ({
          deleteUser: rxMethod<string>(pipe(switchMap((id) => store._delete(id)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.deleteUser(randomId);

      const req = httpTesting.expectOne(
        `${normalisedApiUrl}/${randomId}`,
        "Request to delete an existing user",
      );

      expect(req.request.method).toBe("DELETE");
      req.flush({});
      httpTesting.verify();
    });
  });
});

interface User {
  id: string;
  name: string;
  age: number;
}

interface UserState {
  users: User[];
}

type CreateUser = Omit<User, "id">;
type UpdateUser = Partial<User>;

const usersApiUrlFactory = () => "http://localhost:9090/api/v1/users";

const randomId = crypto.randomUUID();
const leadingForwardSlashApiUrl = "/https://testing-endpoint";
const trailingForwardSlashApiUrl = "https://testing-endpoint/";
const leadingAndTrailingForwardSlashApiUrl = "/https://testing-endpoint/";
const normalisedApiUrl = "https://testing-endpoint";
