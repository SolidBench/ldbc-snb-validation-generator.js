import type { Readable } from 'node:stream';
import { createReadStream } from 'fs-extra';
import type { IParameterSource } from './IParameterSource';
import { LdbcValidationTransformer } from './LdbcValidationTransformer';

/**
 * A parameters source that reads LDBC validation parameters files.
 */
export class ParametersSourceLdbcValidation implements IParameterSource {
  public constructor(
    public readonly path: string,
  ) {}

  public async getParameters(): Promise<Readable> {
    return createReadStream(this.path).pipe(new LdbcValidationTransformer());
  }
}
