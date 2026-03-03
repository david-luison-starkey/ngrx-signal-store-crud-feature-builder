import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from "@ngrx/signals";
import { withCrudMethods } from "./feature";
import { TestBed } from "@angular/core/testing";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchAll, switchMap, tap } from "rxjs";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";

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

const baseApiUrl = "http://localhost:9090/api/v1/users/";

describe("Crud Methods Builder", () => {
  describe("Signal Store integration", () => {
    it("should expose all methods built via the builder", async () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState({}),
          withCrudMethods<User>(baseApiUrl)
            .get()
            .getAll()
            .create<CreateUser>()
            .update<UpdateUser>()
            .delete()
            .build(),
        );
        const store = new Store();

        expect(Object.hasOwn(store, "_get")).toBe(true);
        expect(typeof (store as any)._get).toBe("function");
        expect(Object.hasOwn(store, "_create")).toBe(true);
        expect(typeof (store as any)._create).toBe("function");
        expect(Object.hasOwn(store, "_getAll")).toBe(true);
        expect(typeof (store as any)._getAll).toBe("function");
        expect(Object.hasOwn(store, "_delete")).toBe(true);
        expect(typeof (store as any)._delete).toBe("function");
        expect(Object.hasOwn(store, "_update")).toBe(true);
        expect(typeof (store as any)._update).toBe("function");
      });
    });

    it("should only expose methods built via the builder", async () => {
      TestBed.runInInjectionContext(() => {
        const ExposedMethodsStore = signalStore(
          withState({}),
          withCrudMethods<User>(baseApiUrl).get().create<CreateUser>().build(),
        );
        const store = new ExposedMethodsStore();

        expect(Object.hasOwn(store, "_get")).toBe(true);
        expect(Object.hasOwn(store, "_create")).toBe(true);
        expect(typeof (store as any)._get).toBe("function");
        expect(typeof (store as any)._create).toBe("function");
        expect(Object.hasOwn(store, "_getAll")).toBe(false);
        expect(Object.hasOwn(store, "_delete")).toBe(false);
        expect(Object.hasOwn(store, "_update")).toBe(false);
      });
    });

    it("should be composable with other features", async () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState<UserState>({ users: [] }),
          withCrudMethods<User>(baseApiUrl)
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
    const id = "1234D";

    it("_get", async () => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(baseApiUrl).get().build(),
        withMethods((store) => ({
          getUser: rxMethod<string>(pipe(switchMap((id: string) => store._get(id)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.getUser(id);

      const req = httpTesting.expectOne(
        `${baseApiUrl}${id}`,
        "Request to retrieve user based on id",
      );

      expect(req.request.method).toBe("GET");
      req.flush({});
      httpTesting.verify();
    });

    it("_getAll", async () => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(baseApiUrl).getAll().build(),
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

      const req = httpTesting.expectOne(`${baseApiUrl}`, "Request to retrieve all users");

      expect(req.request.method).toBe("GET");
      req.flush({});
      httpTesting.verify();
    });

    it("_create", async () => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(baseApiUrl).create<CreateUser>().build(),
        withMethods((store) => ({
          createUser: rxMethod<{ id: string; user: CreateUser }>(
            pipe(switchMap(({ id, user }) => store._create(id, user))),
          ),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.createUser({
        id,
        user: {
          name: "Mario Junior",
          age: 44,
        },
      });

      const req = httpTesting.expectOne(`${baseApiUrl}${id}`, "Request to create a user");

      expect(req.request.method).toBe("POST");
      req.flush({});
      httpTesting.verify();
    });

    it("_update", async () => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(baseApiUrl).update<UpdateUser>().build(),
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
        id,
        user: {
          name: "Mario Junior",
        },
      });

      const req = httpTesting.expectOne(`${baseApiUrl}${id}`, "Request to update an existing user");

      expect(req.request.method).toBe("PUT");
      req.flush({});
      httpTesting.verify();
    });

    it("_delete", async () => {
      const Store = signalStore(
        withState({}),
        withCrudMethods<User>(baseApiUrl).delete().build(),
        withMethods((store) => ({
          deleteUser: rxMethod<string>(pipe(switchMap((id) => store._delete(id)))),
        })),
      );

      TestBed.configureTestingModule({
        providers: [Store, provideHttpClient(), provideHttpClientTesting()],
      });

      const httpTesting = TestBed.inject(HttpTestingController);
      const store = TestBed.inject(Store);
      store.deleteUser(id);

      const req = httpTesting.expectOne(`${baseApiUrl}${id}`, "Request to delete an existing user");

      expect(req.request.method).toBe("DELETE");
      req.flush({});
      httpTesting.verify();
    });
  });
});
