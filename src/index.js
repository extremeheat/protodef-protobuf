// TODO: Monkey patch: Wait for this to be merged upstream
// https://github.com/ProtoDef-io/node-protodef/pull/169
const { ProtoDefCompiler } = require('protodef/src/compiler')
const original = ProtoDefCompiler.prototype.compileProtoDefSync
ProtoDefCompiler.prototype.compileProtoDefSync = function () {
  const compiled = original.call(this)
  compiled.setVariable('sizeOfCtx', compiled.sizeOfCtx)
  return compiled
}

const fs = require('fs')
const path = require('path')
const schemaParser = require('protocol-buffers-schema')
const { transpileProtobufAST, mergeAsts } = require('./transpiler.js')
const importHelpers = require('./imports.js')
const compilerTypes = require('./datatypes/compiler.js')
const interpreterTypes = require('./datatypes/interpreter.js')

/**
 * A higher-level wrapper that parses and transpiles an array of .proto schema strings.
 * @param {string[]} schemas - An array of strings, where each string is the content of a .proto file.
 * @param {object} options - Options for transpilation
 * @param {boolean} options.allowImports - If false (default), handle Google imports automatically but error on external imports
 * @returns {object} The protodef JSON schema.
 */
function transpile (schemas, options = {}) {
  const { allowImports = false } = options

  const asts = schemas.map(s => schemaParser.parse(s))

  // Check for imports and handle them appropriately
  if (!allowImports) {
    const imports = importHelpers.findImports(asts)
    if (imports.length > 0) {
      // Check if all imports are Google well-known types
      const { GOOGLE_WELL_KNOWN_TYPES } = require('./google-types.js')
      const googleImports = imports.filter(imp => GOOGLE_WELL_KNOWN_TYPES[imp])
      const externalImports = imports.filter(imp => !GOOGLE_WELL_KNOWN_TYPES[imp])
      
      if (externalImports.length > 0) {
        // There are external imports - throw error
        throw importHelpers.createImportError(imports)
      } else {
        // Only Google imports - automatically resolve them
        const googleSchemas = googleImports.map(imp => GOOGLE_WELL_KNOWN_TYPES[imp].trim())
        schemas = [...googleSchemas, ...schemas]
      }
    }
  }

  const mergedAst = mergeAsts(schemas.map(s => schemaParser.parse(s)))
  return transpileProtobufAST(mergedAst)
}

/**
 * Transpile .proto files from the filesystem with automatic import resolution.
 *
 * ⚠️  CURRENT LIMITATIONS:
 * - Works best with Google well-known types (google/protobuf/*)
 * - Cross-package type references may have issues in complex scenarios
 * - For complex imports, use the manual transpile() approach with allowImports: true
 *
 * @param {string[]} filePaths - Array of .proto file paths to transpile
 * @param {object} options - Options for file loading and import resolution
 * @param {string} options.baseDir - Base directory for resolving relative paths (default: process.cwd())
 * @param {string[]} options.includeDirs - Additional directories to search for imports (default: [])
 * @param {boolean} options.resolveImports - Whether to automatically resolve import statements (default: true)
 * @param {boolean} options.includeGoogleTypes - Whether to include Google well-known types (default: true)
 * @returns {object} The protodef JSON schema.
 */
function transpileFromFiles (filePaths, options = {}) {
  const {
    baseDir = process.cwd(),
    includeDirs = [],
    resolveImports = true,
    includeGoogleTypes = true
  } = options

  // Load main schema files
  const mainSchemas = filePaths.map(filePath => {
    const fullPath = path.resolve(baseDir, filePath)
    try {
      return fs.readFileSync(fullPath, 'utf8')
    } catch (error) {
      throw new Error(`Could not read .proto file: "${fullPath}"\n${error.message}`)
    }
  })

  const allSchemas = [...mainSchemas]

  if (resolveImports) {
    // Parse to find imports
    const mainAsts = mainSchemas.map(schema => schemaParser.parse(schema))
    const imports = importHelpers.findImports(mainAsts)

    if (imports.length > 0) {
      // Resolve imports and add them to the schema list
      const importedSchemas = importHelpers.resolveImports(imports, {
        baseDir,
        includeDirs,
        includeGoogleTypes
      })
      allSchemas.push(...importedSchemas)
    }
  }

  // Transpile with imports allowed since we've resolved them
  return transpile(allSchemas, { allowImports: true })
}

/**
 * A helper function to add all the custom protobuf types to a ProtoDef compiler instance.
 * @param {ProtoDefCompiler} compiler - An instance of the ProtoDefCompiler.
 */
function addTypesToCompiler (compiler) {
  compiler.addTypes(compilerTypes)
  // Add type aliases that the transpiler generates
  compiler.addTypesToCompile({
    protobuf_string: ['pstring', { countType: 'varint' }],
    protobuf_bytes: ['buffer', { countType: 'varint' }]
  })
}

/**
 * A helper function to add all the custom protobuf types to a ProtoDef interpreter instance.
 * @param {ProtoDef} protodef - An instance of the ProtoDef interpreter.
 */
function addTypesToInterpreter (protodef) {
  protodef.addTypes(interpreterTypes)
}

module.exports = {
  transpile,
  transpileFromFiles,
  addTypesToCompiler,
  addTypesToInterpreter,
  // Expose lower-level modules for advanced use
  transpiler: require('./transpiler.js'),
  compiler: require('./datatypes/compiler.js'),
  interpreter: require('./datatypes/interpreter.js'),
  // Google well-known types (optional)
  googleTypes: require('./google-types.js')
}
