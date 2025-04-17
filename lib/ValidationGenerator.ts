import type { IQueryResultDestination } from './destination/IQueryResultDestination';
import type { IParameterSource } from './parametersource/IParameterSource';
import type { IQueryHandler } from './queryhandler/IQueryHandler';
import type { QueryParameters } from './QueryParameters';

/**
 * Main entrypoint for handles validation parameters.
 */
export class ValidationGenerator {
  public constructor(
    public readonly parameterSource: IParameterSource,
    public readonly destination: IQueryResultDestination,
    public readonly queryHandlers: IQueryHandler[],
  ) {}

  public async generate(): Promise<void> {
    const parametersStream = await this.parameterSource.getParameters();
    const pendingPromises: Promise<void>[] = [];
    return new Promise<void>((resolve, reject) => {
      let queryIndex = 0;
      parametersStream.on('data', (parameters: QueryParameters) => {
        // eslint-disable-next-line ts/no-this-alias
        const self = this;
        pendingPromises.push((async function() {
          for (const queryHandler of self.queryHandlers) {
            const result = await queryHandler.handle(parameters);
            if (!result) {
              continue;
            }

            // Write away result
            if (result.valid) {
              await self.destination.write(queryIndex++, result.query, result.results);
            }
            return;
          }

          // eslint-disable-next-line no-console
          console.warn(`Could not find a query handler for ${parameters.queryIdentifier}`);
        })().catch((error) => {
          parametersStream.emit('error', error);
        }));
      });
      parametersStream.on('error', reject);
      parametersStream.on('end', () => {
        Promise.all(pendingPromises).then(() => resolve(), reject);
      });
    });
  }
}
