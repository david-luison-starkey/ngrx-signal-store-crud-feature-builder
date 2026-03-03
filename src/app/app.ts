import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { patchState, signalStore, withMethods, withState } from "@ngrx/signals";
import { withCrudMethods } from "./with-crud-methods/feature";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchMap, tap } from "rxjs";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
}

const Store = signalStore(
  withState({}),
  withCrudMethods<User>("/api/v1/users/")
    .get()
    .getAll()
    .create<Omit<User, "id">>()
    .update<Partial<User>>()
    .delete()
    .build(),
  withMethods((store) => ({
    createUser: rxMethod<User>(
      pipe(
        switchMap((user) =>
          store._create("3a3d5bbb-36ba-4cc0-a6f0-16389309e020", {
            firstName: "John",
            lastName: "Smith",
            age: 34,
          }),
        ),
      ),
    ),
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

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  providers: [Store],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  protected readonly title = signal("ngrx-signal-store-crud-feature-builder");
  store = inject(Store);
}
