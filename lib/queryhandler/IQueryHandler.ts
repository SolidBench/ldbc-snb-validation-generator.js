import type { QueryParameters } from '../QueryParameters';

/**
 * Handles query validation parameters.
 */
export interface IQueryHandler {
  /**
   * Handle query parameters.
   * @param queryParameters query parameters
   * @return result A handled query, or undefined if this handler does not support the given query parameters.
   */
  handle: (queryParameters: QueryParameters) => Promise<IHandledQuery | undefined>;
}

export interface IHandledQuery {
  /**
   * If this query and results data must be written away.
   * Can be false for void handlers.
   */
  valid: boolean;
  /**
   * A query string.
   */
  query: string;
  /**
   * A results string.
   */
  results: string;
}
