import { PassThrough } from 'node:stream';
import { VariableTemplateLiteral, VariableTemplateNamedNode } from 'sparql-query-parameter-instantiator';
import type { IQueryResultDestination } from '../lib/destination/IQueryResultDestination';
import type { IParameterSource } from '../lib/parametersource/IParameterSource';
import type { IQueryHandler } from '../lib/queryhandler/IQueryHandler';
import { SparqlQueryHandler } from '../lib/queryhandler/SparqlQueryHandler';
import { QueryParameters } from '../lib/QueryParameters';
import { ValidationGenerator } from '../lib/ValidationGenerator';

const files: Record<string, string> = {};

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  promises: {
    async readFile(filePath: string) {
      if (filePath in files) {
        return files[filePath];
      }
      throw new Error(`Unknown file in ValidationGenerator: ${filePath}`);
    },
  },
}));

describe('ValidationGenerator', () => {
  let parameterSource: IParameterSource;
  let destination: IQueryResultDestination;
  let queryHandlers: IQueryHandler[];
  let generator: ValidationGenerator;

  beforeEach(() => {
    files['path/q1'] = `SELECT ?selected1 ?selected2 ?selected3 WHERE {
    ?var1 <ex:p1> ?selected1.
    ?var2 <ex:p2> ?selected2.
    ?var3 <ex:p3> ?selected3.
}`;
    files['path/q2'] = `SELECT ?selected1 WHERE {
    ?var1 <ex:p1.2> ?selected1.
    ?var2 <ex:p2.2> ?selected2.
    ?var3 <ex:p3.2> ?selected3.
}`;
    destination = { write: jest.fn() };
    queryHandlers = [
      new SparqlQueryHandler(
        'q1',
        'path/q1',
        [
          new VariableTemplateNamedNode('var1'),
          new VariableTemplateNamedNode('var2'),
        ],
        [
          new VariableTemplateLiteral('selected1'),
          new VariableTemplateLiteral('selected2'),
          new VariableTemplateLiteral('selected3'),
        ],
      ),
      new SparqlQueryHandler(
        'q2',
        'path/q2',
        [
          new VariableTemplateNamedNode('var1'),
          new VariableTemplateNamedNode('var2'),
          new VariableTemplateNamedNode('var3'),
        ],
        [
          new VariableTemplateLiteral('selected1'),
        ],
      ),
    ];
  });

  describe('for valid parameters', () => {
    beforeEach(() => {
      parameterSource = {
        getParameters: jest.fn(async() => {
          const stream = new PassThrough({ objectMode: true });
          stream.write(new QueryParameters(
            'q1',
            [ 'ex:V1', 'ex:V2' ],
            [
              [ 'R1.1', 'R1.2', 1.3 ],
              [ 'R2.1', 'R2.2', 2.3 ],
            ],
          ));
          stream.write(new QueryParameters(
            'q2',
            [ 'ex:V1', 'ex:V2', 3 ],
            [
              [ 'R1.1' ],
              [ 'R2.1' ],
            ],
          ));
          stream.write(new QueryParameters(
            'q-ignored',
            [ 'ex:V1', 'ex:V2', 3 ],
            [
              [ 'R1.1' ],
              [ 'R2.1' ],
            ],
          ));
          stream.end();
          return stream;
        }),
      };
      generator = new ValidationGenerator(parameterSource, destination, queryHandlers);
    });

    it('generate', async() => {
      await generator.generate();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(destination.write).toHaveBeenCalledTimes(2);
      expect(destination.write).toHaveBeenNthCalledWith(
        1,
        0,
        `SELECT ?selected1 ?selected2 ?selected3 WHERE {
  <ex:V1> <ex:p1> ?selected1.
  <ex:V2> <ex:p2> ?selected2.
  ?var3 <ex:p3> ?selected3.
}`,
        `{
  "head": {
    "vars": [
      "selected1",
      "selected2",
      "selected3"
    ]
  },
  "results": {
    "bindings": [
      {
        "selected1": {
          "type": "literal",
          "value": "R1.1"
        },
        "selected2": {
          "type": "literal",
          "value": "R1.2"
        },
        "selected3": {
          "type": "literal",
          "value": "1.3"
        }
      },
      {
        "selected1": {
          "type": "literal",
          "value": "R2.1"
        },
        "selected2": {
          "type": "literal",
          "value": "R2.2"
        },
        "selected3": {
          "type": "literal",
          "value": "2.3"
        }
      }
    ]
  }
}`,
      );
      expect(destination.write).toHaveBeenNthCalledWith(
        2,
        1,
        `SELECT ?selected1 WHERE {
  <ex:V1> <ex:p1.2> ?selected1.
  <ex:V2> <ex:p2.2> ?selected2.
  <3> <ex:p3.2> ?selected3.
}`,
        `{
  "head": {
    "vars": [
      "selected1"
    ]
  },
  "results": {
    "bindings": [
      {
        "selected1": {
          "type": "literal",
          "value": "R1.1"
        }
      },
      {
        "selected1": {
          "type": "literal",
          "value": "R2.1"
        }
      }
    ]
  }
}`,
      );
    });
  });

  describe('for invalid parameters', () => {
    beforeEach(() => {
      parameterSource = {
        getParameters: jest.fn(async() => {
          const stream = new PassThrough({ objectMode: true });
          stream.write(new QueryParameters(
            'q1',
            [ 'ex:V1', 'ex:V2' ],
            [
              [ 'R1.1', 'R1.2', 1.3 ],
              [ 'R2.1', 'R2.2', 2.3 ],
            ],
          ));
          stream.write(new QueryParameters(
            'q2',
            [ 'ex:V1', 'ex:V2' ],
            [
              [ 'R1.1' ],
              [ 'R2.1' ],
            ],
          ));
          stream.end();
          return stream;
        }),
      };
      generator = new ValidationGenerator(parameterSource, destination, queryHandlers);
    });

    it('generate', async() => {
      await expect(generator.generate()).rejects
        .toThrow(`Invalid query parameters for 'q2'. Encountered a validation query with 2 parameters, while 3 variables were defined in the config.`);
    });
  });
});
