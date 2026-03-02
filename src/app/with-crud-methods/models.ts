export type CrudMethods = "create" | "update" | "get" | "getAll" | "delete";

export type PrivateSignalStoreCrudMethods = `_${CrudMethods}`;
