import type { TransformCallback } from 'node:stream';
import { Transform } from 'node:stream';
import type { QueryResult } from '../QueryParameters';
import { QueryParameters } from '../QueryParameters';

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2'
| 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

/**
 * Transforms a text stream into a stream of {@link QueryParameters}.
 */
export class LdbcValidationTransformer extends Transform {
  private lineBuffer: string[] = [];

  public constructor() {
    super({ decodeStrings: true, readableObjectMode: true, writableObjectMode: true });
  }

  // eslint-disable-next-line ts/naming-convention
  public _transform(chunkBuffer: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    const chunk = chunkBuffer.toString();
    for (let i = 0; i < chunk.length; i++) {
      const character = chunk.charAt(i);
      if (character === '\n') {
        try {
          this.flushLine();
        } catch (error: unknown) {
          this.destroy(<Error> error);
        }
      } else {
        this.lineBuffer.push(character);
      }
    }
    callback();
  }

  // eslint-disable-next-line ts/naming-convention
  public _flush(callback: TransformCallback): void {
    try {
      this.flushLine();
    } catch (error: unknown) {
      this.destroy(<Error> error);
    }
    callback();
  }

  public flushLine(): void {
    // Extract line string and reset buffer
    const line = this.lineBuffer.join('');
    this.lineBuffer = [];

    if (line) {
      const parameters = this.parseLine(line);
      this.push(parameters);
    }
  }

  public parseJsonContext(data: string, line: string, part: string): any {
    try {
      return JSON.parse(data);
    } catch (error: unknown) {
      throw new Error(`Detected invalid JSON in the ${part} part of: '${line}'\n${(<Error> error).message}`);
    }
  }

  public parseLine(line: string): QueryParameters {
    // Determine line components
    const matches = /(\[[^|]*\])\|(.*)/u.exec(line);
    if (matches === null) {
      throw new Error(`Detected invalid validation line: '${line}'`);
    }

    // Parse components as JSON
    const [ queryIdentifier, ...queryParameters ] = this.parseJsonContext(matches[1], line, 'query');
    const results = this.parseJsonContext(matches[2], line, 'results');

    // Splice off last query parameter, because that one is unused (unsure why, seems to always be 20...)
    queryParameters.splice(-1, 1);

    return new QueryParameters(<string>queryIdentifier, <(string | number)[]>queryParameters, <QueryResult[][]>results);
  }
}
