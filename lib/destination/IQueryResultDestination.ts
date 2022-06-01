/**
 * A destination for queries and results.
 */
export interface IQueryResultDestination {
  /**
   * Write away the given query-results pair.
   * @param queryId The numerical identifier of the query.
   * @param query The query string.
   * @param results The results string.
   */
  write: (queryId: number, query: string, results: string) => Promise<void>;
}
