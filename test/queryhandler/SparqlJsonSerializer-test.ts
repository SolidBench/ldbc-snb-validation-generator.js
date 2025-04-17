import { DataFactory } from 'rdf-data-factory';
import { VariableTemplateLiteral, VariableTemplateNamedNode } from 'sparql-query-parameter-instantiator';
import { SparqlJsonSerializer } from '../../lib/queryhandler/SparqlJsonSerializer';
import { QueryParameters } from '../../lib/QueryParameters';

const DF = new DataFactory();

describe('SparqlJsonSerializer', () => {
  let serializer: SparqlJsonSerializer;

  beforeEach(() => {
    serializer = new SparqlJsonSerializer([
      new VariableTemplateNamedNode('varA'),
      new VariableTemplateLiteral('varB'),
    ]);
  });

  describe('serialize', () => {
    it('should handle valid parameters', () => {
      expect(serializer.serialize(new QueryParameters(
        'q1',
        [],
        [
          [ 'ex:valA.1', 'valB.1' ],
          [ 'ex:valA.2', 'valB.2' ],
        ],
      ))).toBe(`{
  "head": {
    "vars": [
      "varA",
      "varB"
    ]
  },
  "results": {
    "bindings": [
      {
        "varA": {
          "type": "uri",
          "value": "ex:valA.1"
        },
        "varB": {
          "type": "literal",
          "value": "valB.1"
        }
      },
      {
        "varA": {
          "type": "uri",
          "value": "ex:valA.2"
        },
        "varB": {
          "type": "literal",
          "value": "valB.2"
        }
      }
    ]
  }
}`);
    });

    it('should throw on invalid parameters', () => {
      expect(() => serializer.serialize(new QueryParameters(
        'q1',
        [],
        [
          [ 'ex:valA.1', 'valB.1' ],
          [ 'ex:valA.2' ],
        ],
      ))).toThrow(`Invalid query parameters for 'q1'. Encountered a validation query with 1 variables in a query result, while 2 result variables were defined in the config.`);
    });
  });

  describe('termToSparqlJsonTerm', () => {
    it('handles named nodes', () => {
      expect(serializer.termToSparqlJsonTerm(DF.namedNode('ex:a')))
        .toEqual({ type: 'uri', value: 'ex:a' });
    });

    it('handles blank nodes', () => {
      expect(serializer.termToSparqlJsonTerm(DF.blankNode('a')))
        .toEqual({ type: 'bnode', value: 'a' });
    });

    it('handles plain literals', () => {
      expect(serializer.termToSparqlJsonTerm(DF.literal('a')))
        .toEqual({ type: 'literal', value: 'a' });
    });

    it('handles language-tagged literals', () => {
      expect(serializer.termToSparqlJsonTerm(DF.literal('a', 'en')))
        .toEqual({ type: 'literal', value: 'a', 'xml:lang': 'en' });
    });

    it('handles datatyped literals', () => {
      expect(serializer.termToSparqlJsonTerm(DF.literal('a', DF.namedNode('ex:a'))))
        .toEqual({ type: 'literal', value: 'a', datatype: 'ex:a' });
    });

    it('throws on variables', () => {
      expect(() => serializer.termToSparqlJsonTerm(DF.variable('a')))
        .toThrow('Unsupported term type Variable for SPARQL/JSON serialization');
    });

    it('throws on default graphs', () => {
      expect(() => serializer.termToSparqlJsonTerm(DF.defaultGraph()))
        .toThrow('Unsupported term type DefaultGraph for SPARQL/JSON serialization');
    });

    it('throws on quads', () => {
      expect(() => serializer.termToSparqlJsonTerm(DF.quad(DF.namedNode('a'), DF.namedNode('a'), DF.namedNode('a'))))
        .toThrow('Unsupported term type Quad for SPARQL/JSON serialization');
    });
  });
});
