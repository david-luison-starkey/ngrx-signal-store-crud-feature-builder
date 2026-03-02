import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { patchState, signalStore, withMethods, withState } from "@ngrx/signals";
import { withCrudMethods } from "./with-crud-methods/feature";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchMap, tap } from "rxjs";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  protected readonly title = signal("ngrx-signal-store-crud-feature-builder");
  store = inject(Store);

  constructor() {
    this.store.getUser("1913D");
  }
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
}

const Store = signalStore(
  withState({}),
  withCrudMethods<User>("/api/v1")
    .get()
    .getAll()
    .create<Omit<User, "id">>()
    .update<Partial<User>>()
    .delete()
    .build(),
  withMethods((store) => ({
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
