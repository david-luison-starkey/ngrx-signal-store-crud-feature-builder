import { HttpClient } from "@angular/common/http";
import type { HttpClientParams, HttpOptions, PagedResponse } from "./models";
import { first } from "rxjs";

export const _get =
  (httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>(id: string) =>
    httpClient.get<Type>(`${apiUrl}/${id}`, httpOptions).pipe(first());

export const _getAll =
  (httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>() =>
    httpClient.get<Type[]>(apiUrl, httpOptions).pipe(first());

export const _pagedSearch =
  (httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>(searchParams: HttpClientParams) =>
    httpClient
      .get<PagedResponse<Type>>(`${apiUrl}`, { params: { ...searchParams }, ...httpOptions })
      .pipe(first());

export const _create =
  <CreateType>(httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>(data: CreateType) =>
    httpClient.post<Type>(apiUrl, data, httpOptions).pipe(first());

export const _update =
  <UpdateType>(httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>(id: string, data: UpdateType) =>
    httpClient.put<Type>(`${apiUrl}/${id}`, data, httpOptions).pipe(first());

export const _delete =
  (httpClient: HttpClient, apiUrl: string, httpOptions: HttpOptions) =>
  <Type>(id: string) =>
    httpClient.delete<void>(`${apiUrl}/${id}`, httpOptions).pipe(first());
