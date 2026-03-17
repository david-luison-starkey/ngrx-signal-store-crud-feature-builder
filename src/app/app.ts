import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { patchState, signalStore, withMethods, withState } from "@ngrx/signals";
import { withCrudMethods } from "./with-crud-methods/feature";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { pipe, switchMap, tap } from "rxjs";
import { ProtoProgressStore } from "./with-crud-methods/proto";

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
  proto = inject(ProtoProgressStore);

  constructor() {
    console.log(this.proto.userEntities());
    console.log(this.proto.userIds());
    console.log(this.proto.userEntityMap());
    this.proto.add();
    this.proto.add();
    this.proto.add();
  }
}
