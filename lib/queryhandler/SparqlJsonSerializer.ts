import type * as RDF from '@rdfjs/types';
import type { IVariableTemplate } from 'sparql-query-parameter-instantiator';
import type { QueryParameters } from '../QueryParameters';

/**
 * Serializes query results to the SPARQL/JSON format.
 */
export class SparqlJsonSerializer {
  public constructor(
    public readonly resultVariables: IVariableTemplate[],
  ) {}

  public serialize(params: QueryParameters): string {
    // Construct bindings for all solution mappings in the solution sequence
    const bindings = params.results.map((solutionMapping) => {
      // Validate number of variables
      if (solutionMapping.length !== this.resultVariables.length) {
        throw new Error(`Invalid query parameters for '${params.queryIdentifier}'. Encountered a validation query with ${solutionMapping.length} variables in a query result, while ${this.resultVariables.length} result variables were defined in the config.`);
      }

      return Object.fromEntries(solutionMapping
        .map((binding, i) => [
          this.resultVariables[i].getName(),
          this.termToSparqlJsonTerm(this.resultVariables[i].createTerm(binding)),
        ]));
    });

    // Accumulate all data
    const data = {
      head: {
        vars: this.resultVariables.map(variable => variable.getName()),
      },
      results: { bindings },
    };

    // Convert to JSON string
    return JSON.stringify(data, null, '  ');
  }

  public termToSparqlJsonTerm(term: RDF.Term): any {
    switch (term.termType) {
      case 'NamedNode':
        return { type: 'uri', value: term.value };
      case 'BlankNode':
        return { type: 'bnode', value: term.value };
      case 'Literal':
        return {
          type: 'literal',
          value: term.value,
          // eslint-disable-next-line ts/naming-convention
          ...term.language ? { 'xml:lang': term.language } : undefined,
          ...!term.language && term.datatype && term.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string' ?
              { datatype: term.datatype.value } :
            undefined,
        };
      case 'Variable':
      case 'DefaultGraph':
      case 'Quad':
        throw new Error(`Unsupported term type ${term.termType} for SPARQL/JSON serialization`);
    }
  }
}
