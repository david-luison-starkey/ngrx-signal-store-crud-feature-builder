import { CrudBuilder } from "./builder";
import { type HttpOptions } from "./models";

/**
 * Provides Signal Store private methods - methods prefixed with an
 * underscore - for common http operations.
 *
 * Only methods built using the builder with be exposed to a consuming store.
 *
 * URLs will be constructed for each method.
 *
 * The base API URL is provided via a callback to allow execution within an
 * injection context.
 *
 * @param apiUrlFactory - Function returning the base url to be used for all
 * http requests. Additional operation specific path segments (like id) will
 * be concatenated with `apiUrl`. Leading and trailing forward slashes are
 * stripped.
 * @param httpOptions - Angular `HttpClient` options used to configure
 * all methods and their respective http requests.
 * @example
 * ```ts
 * const Store = signalStore(
 *  withState({}),
 *  withCrudMethods<Course>(() => `${inject(API_BASE_URL)}/courses`)
 *    .get() // _get(id)
 *    .getAll() // _getAll()
 *    .pagedSearch() // _pagedSearch(searchQuery: QueryString)
 *    .create<CreateCourse>(), // _create(newCourse: CreateCourse)
 *    .update<UpdateCourse>(), // _update(id: string, updatedCourse: UpdateCourse)
 *    .delete() // _delete(id)
 *    .build() // create signalStoreFeature()
 * );
 * ```
 *
 */
export function withCrudMethods<Type = never>(
  apiUrlFactory: () => string,
  httpOptions?: Partial<HttpOptions>,
): CrudBuilder<Type> {
  return CrudBuilder.of<Type>(apiUrlFactory, httpOptions);
}
