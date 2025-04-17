# LDBC SNB Validation Generator

[![Build status](https://github.com/SolidBench/ldbc-snb-validation-generator.js/workflows/CI/badge.svg)](https://github.com/SolidBench/ldbc-snb-validation-generator.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/SolidBench/ldbc-snb-validation-generator.js/badge.svg?branch=master)](https://coveralls.io/github/SolidBench/ldbc-snb-validation-generator.js?branch=master)
[![npm version](https://badge.fury.io/js/ldbc-snb-validation-generator.svg)](https://www.npmjs.com/package/ldbc-snb-validation-generator)

Generates SPARQL validation queries and results for the [LDBC SNB](https://github.com/ldbc/ldbc_snb_datagen_hadoop) social network dataset.

As input, this tool it takes [LDBC validation parameter files](https://github.com/ldbc/ldbc_snb_interactive_driver/wiki/Validating-a-Database-Connector#imaginary-example) in the following format:
```text
["com.ldbc.driver.workloads.ldbc.snb.interactive.LdbcQuery4",21990232559429,1335830400000,37,10]|[["Hassan_II_of_Morocco",2],["Appeal_to_Reason",1],["Principality_of_Littoral_Croatia",1],["Rivers_of_Babylon",1],["Van_Morrison",1]]
["com.ldbc.driver.workloads.ldbc.snb.interactive.LdbcQuery6",30786325583618,"Angola",10]|[["Tom_Gehrels",28],["Sammy_Sosa",9],["Charles_Dickens",5],["Genghis_Khan",5],["Ivan_Ljubičić",5],["Marc_Gicquel",5],["Freddie_Mercury",4],["Peter_Hain",4],["Robert_Fripp",4],["Boris_Yeltsin",3]]
...
```
Each row in this file corresponds to validation parameters for a given query, and its expected results.

As output, this tool creates a directory containing `.sparql` and `.results` files for each row in this validation parameter file.
The `.sparql` is a plain SPARQL query string, and `.results` contains the expected result serialized as [SPARQL/JSON](https://www.w3.org/TR/sparql11-results-json/).

Example `.sparql` output:
```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?tagName (COUNT(*) AS ?postCount) WHERE {
  BIND("2012-08-01T00:00:00.000Z"^^xsd:dateTime + (STRDT(CONCAT("P", "29", "D"), xsd:duration)) AS ?endDate)
  <http://localhost:3000/pods/24189255814337/profile/card#me> rdf:type snvoc:Person;
    ((snvoc:knows/snvoc:hasPerson)|^(snvoc:knows/snvoc:hasPerson)) ?fr.
  ?post rdf:type snvoc:Post;
    snvoc:hasCreator ?fr;
    snvoc:hasTag ?tag.
  ?tag foaf:name ?tagName.
  ?post snvoc:creationDate ?creationDate.
  FILTER((?creationDate >= "2012-08-01T00:00:00.000Z"^^xsd:dateTime) && (?creationDate <= ?endDate))
  FILTER(NOT EXISTS {
    <http://localhost:3000/pods/24189255814337/profile/card#me> ((snvoc:knows/snvoc:hasPerson)|^(snvoc:knows/snvoc:hasPerson)) ?fr2.
    ?post2 snvoc:hasCreator ?fr2;
      rdf:type snvoc:Post;
      snvoc:hasTag ?tag;
      snvoc:creationDate ?creationDate2.
    FILTER(?creationDate2 < "2012-08-01T00:00:00.000Z"^^xsd:dateTime)
  })
}
GROUP BY ?tagName
ORDER BY DESC (?postCount) (?tagName)
LIMIT 10
```

Example `.results` output:
```json
{
  "head": {
    "vars": [
      "tagName",
      "postCount"
    ]
  },
  "results": {
    "bindings": [
      {
        "tagName": {
          "type": "literal",
          "value": "Ehud_Olmert"
        },
        "postCount": {
          "type": "literal",
          "value": "3"
        }
      },
      {
        "tagName": {
          "type": "literal",
          "value": "Be-Bop-A-Lula"
        },
        "postCount": {
          "type": "literal",
          "value": "1"
        }
      }
    ]
  }
}
```

Default validation parameters can be downloaded from https://cloud.ilabt.imec.be/index.php/s/bBZZKb7cP95WgcD/download/validation_params.zip

## Installation

```bash
$ npm install -g ldbc-snb-validation-generator
```
or
```bash
$ yarn global add ldbc-snb-validation-generator
```

## Usage

### Invoke from the command line

This tool can be used on the command line as `ldbc-snb-validation-generator`,
which takes as single parameter the path to a config file:

```bash
$ ldbc-snb-validation-generator path/to/config.json
```

### Config file

The config file that should be passed to the command line tool has the following JSON structure:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/ldbc-snb-validation-generator/^1.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/sparql-query-parameter-instantiator/^2.0.0/components/context.jsonld"
  ],
  "@id": "urn:ldbc-snb-validation-generator:default",
  "@type": "ValidationGenerator",
  "parameterSource": {
    "@type": "ParametersSourceLdbcValidation",
    "path": "path/to/validation_params-sf1-without-updates.csv"
  },
  "destination": {
    "@type": "QueryResultDestinationDirectory",
    "path": "output"
  },
  "queryHandlers": [
    {
      "@type": "SparqlQueryHandler",
      "identifier": "com.ldbc.driver.workloads.ldbc.snb.interactive.LdbcQuery2",
      "templateFilePath": "path/to/queries/interactive-complex-2.sparql",
      "variables": [
        {
          "@type": "VariableTemplateNamedNode",
          "name": "rootPerson",
          "valueTransformers": [
            {
              "@id": "urn:sparql-query-parameter-instantiator:valueTransformerPersonIdToIri"
            }
          ]
        },
        {
          "@type": "VariableTemplateTimestamp",
          "name": "maxDate"
        }
      ],
      "results": [
        {
          "@type": "VariableTemplateLiteral",
          "name": "personId"
        },
        {
          "@type": "VariableTemplateLiteral",
          "name": "personFirstName"
        },
        {
          "@type": "VariableTemplateLiteral",
          "name": "personLastName"
        },
        {
          "@type": "VariableTemplateLiteral",
          "name": "messageId"
        },
        {
          "@type": "VariableTemplateLiteral",
          "name": "messageContent"
        },
        {
          "@type": "VariableTemplateTimestamp",
          "name": "messageCreationDate"
        }
      ]
    }
  ]
}
```

The important parts in this config file are:

* `"parameterSource"`: From where the validation parameters should be obtained.
* `"destination"`: To where the resulting query and result files should be written.
* `"queryHandlers"`: A list of handlers for the different types of queries within the validation parameters, which are identified by the `"identifier"` field.

## Configure

### Query Handlers

The following handlers exist for handling one line within the validation parameters file.

#### SPARQL Query Handler

A query handler that handles queries with a given identifier as SPARQL.

```json
{
  "@type": "SparqlQueryHandler",
  "identifier": "com.ldbc.driver.workloads.ldbc.snb.interactive.LdbcQuery2",
  "templateFilePath": "path/to/queries/interactive-complex-2.sparql",
  "variables": [
    {
      "@type": "VariableTemplateNamedNode",
      "name": "rootPerson",
      "valueTransformers": [
        {
          "@id": "urn:sparql-query-parameter-instantiator:valueTransformerPersonIdToIri",
          "@type": "ValueTransformerReplaceIri",
          "searchRegex": "^(.*)$",
          "replacementString": "http://localhost:3000/pods/$1/profile/card#me"
        }
      ]
    },
    {
      "@type": "VariableTemplateTimestamp",
      "name": "maxDate"
    }
  ],
  "results": [
    {
      "@type": "VariableTemplateLiteral",
      "name": "personId"
    },
    {
      "@type": "VariableTemplateNamedNode",
      "name": "personIri"
    }
  ]
}
```

Parameters:

* `"identifier"`: Identifier for validation queries this handler should apply to.
* `"templateFilePath"`: Path to the SPARQL query template this handler should instantiate queries for.
* `"variables"`: The variables that will be instantiated within the query template.
* `"results"`: The variables that are selected by the query.

The `"variables"` and `"results"` fields contain [variable templates](https://github.com/rubensworks/sparql-query-parameter-instantiator.js#variable-templates)
as defined by [sparql-query-parameter-instantiator.js](https://github.com/rubensworks/sparql-query-parameter-instantiator.js).
To be able to use them, it is therefore required to import them into your config file
by representing your `"@context"` as follows:
```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/ldbc-snb-validation-generator/^1.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/sparql-query-parameter-instantiator/^2.0.0/components/context.jsonld"
  ]
}
```

#### Void Query Handler

A query handler that does nothing for a given query identifier.

```json
{
  "@type": "VoidQueryHandler",
  "identifier": "com.ldbc.driver.workloads.ldbc.snb.interactive.LdbcQuery13"
}
```

Parameters:

* `"identifier"`: Identifier for validation queries this handler should apply to.

## License

This software is written by [Ruben Taelman](https://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
