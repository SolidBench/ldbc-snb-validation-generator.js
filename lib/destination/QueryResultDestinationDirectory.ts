import * as Path from 'node:path';
import { ensureDir, writeFile } from 'fs-extra';
import type { IQueryResultDestination } from './IQueryResultDestination';

/**
 * A query results destination that writes to text files in a directory.
 */
export class QueryResultDestinationDirectory implements IQueryResultDestination {
  /**
   * @param path Path to a directory.
   */
  public constructor(
    public readonly path: string,
  ) {}

  public async write(queryId: number, query: string, results: string): Promise<void> {
    await ensureDir(this.path);
    await writeFile(Path.join(this.path, `${queryId}.sparql`), query);
    await writeFile(Path.join(this.path, `${queryId}.results`), results);
  }
}
