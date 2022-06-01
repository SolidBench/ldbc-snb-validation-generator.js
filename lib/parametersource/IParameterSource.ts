import type * as Readable from 'stream';

/**
 * A source of parameters.
 */
export interface IParameterSource {
  /**
   * Returns a stream of {@link QueryParameters}.
   */
  getParameters: () => Promise<Readable>;
}
