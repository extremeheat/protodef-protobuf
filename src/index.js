const schemaParser = require('protocol-buffers-schema')
const { transpileProtobufAST, mergeAsts } = require('./transpiler.js')
const compilerTypes = require('./datatypes/compiler.js')
const interpreterTypes = require('./datatypes/interpreter.js')

/**
 * A higher-level wrapper that parses and transpiles an array of .proto schema strings.
 * @param {string[]} schemas - An array of strings, where each string is the content of a .proto file.
 * @returns {object} The protodef JSON schema.
 */
function transpile (schemas) {
  const asts = schemas.map(s => schemaParser.parse(s))
  const mergedAst = mergeAsts(asts)
  return transpileProtobufAST(mergedAst)
}

/**
 * A helper function to add all the custom protobuf types to a ProtoDef compiler instance.
 * @param {ProtoDefCompiler} compiler - An instance of the ProtoDefCompiler.
 */
function addTypesToCompiler (compiler) {
  // Ensure we have a string type...
  // TODO: we really should have our own string type to avoid collision with user-defined strings
  compiler.addTypesToCompile({
    string: ['pstring', { countType: 'varint' }],
    bool: 'native'
  })
  compiler.addTypes(compilerTypes)
}

/**
 * A helper function to add all the custom protobuf types to a ProtoDef interpreter instance.
 * @param {ProtoDef} protodef - An instance of the ProtoDef interpreter.
 */
function addTypesToInterpreter (protodef) {
  // Ensure we have a string type...
  protodef.addTypes({
    string: ['pstring', { countType: 'varint' }],
    bool: 'native'
  })
  protodef.addTypes(interpreterTypes)
}

module.exports = {
  transpile,
  addTypesToCompiler,
  addTypesToInterpreter,
  // Expose lower-level modules for advanced use
  transpiler: require('./transpiler.js'),
  compiler: require('./datatypes/compiler.js'),
  interpreter: require('./datatypes/interpreter.js')
}
