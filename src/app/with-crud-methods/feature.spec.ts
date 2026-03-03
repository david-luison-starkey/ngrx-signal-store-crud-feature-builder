import { signalStore, withMethods, withState } from "@ngrx/signals";
import { withCrudMethods } from "./feature";
import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchMap } from "rxjs";

interface User {
  id: string;
  name: string;
  age: number;
}

type CreateUser = Omit<User, "id">;
type UpdateUser = Partial<User>;

const baseApiUrl = "http://localhost:9090/api/v1/users/";

describe("Crud Methods Builder", () => {
  describe("Signal Store integration", () => {
    it("should expose methods only to the consuming store", async () => {
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
          withMethods((store) => ({
            getUsers: rxMethod<void>(pipe(switchMap(() => store._getAll()))),
          })),
        );
        const store = new Store();

        expect(store.getUsers).toBeDefined();
        expect(Object.keys(store)).toHaveLength(6);
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

    it("should honour method specific generics", async () => {});

    it("should be composable with other features", async () => {});
  });

  describe("Http method functionality", () => {
    it("_get", async () => {});

    it("_getAll", async () => {});

    it("_create", async () => {});

    it("_update", async () => {});

    it("_delete", async () => {});
  });
});
