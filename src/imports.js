const fs = require('fs')
const path = require('path')
const { GOOGLE_WELL_KNOWN_TYPES } = require('./google-types.js')

/**
 * Check if any schema contains import statements
 * @param {Array} asts - Array of parsed ASTs from protocol-buffers-schema
 * @returns {Array} Array of all import paths found
 */
function findImports (asts) {
  const allImports = []
  for (const ast of asts) {
    if (ast.imports && ast.imports.length > 0) {
      allImports.push(...ast.imports)
    }
  }
  return [...new Set(allImports)] // Remove duplicates
}

/**
 * Resolve imports by loading from various sources
 * @param {Array} importPaths - Array of import paths to resolve
 * @param {Object} options - Resolution options
 * @returns {Array} Array of resolved schema strings
 */
function resolveImports (importPaths, options = {}) {
  const {
    baseDir = process.cwd(),
    includeDirs = [],
    includeGoogleTypes = true
  } = options

  const resolvedSchemas = []
  const resolvedPaths = new Set()

  for (const importPath of importPaths) {
    if (resolvedPaths.has(importPath)) {
      continue // Skip duplicates
    }

    let schemaContent = null

    // Try Google well-known types first
    if (includeGoogleTypes && GOOGLE_WELL_KNOWN_TYPES[importPath]) {
      schemaContent = GOOGLE_WELL_KNOWN_TYPES[importPath].trim()
    } else {
      // Try to load from filesystem
      const searchPaths = [baseDir, ...includeDirs]

      for (const searchDir of searchPaths) {
        const fullPath = path.resolve(searchDir, importPath)
        try {
          if (fs.existsSync(fullPath)) {
            schemaContent = fs.readFileSync(fullPath, 'utf8')
            break
          }
        } catch (error) {
          // Continue to next search path
        }
      }
    }

    if (!schemaContent) {
      throw new Error(
        `Could not resolve import: "${importPath}"\n` +
        'Searched in:\n' +
        `  - Google well-known types: ${includeGoogleTypes ? 'enabled' : 'disabled'}\n` +
        `  - Base directory: ${baseDir}\n` +
        `  - Include directories: ${includeDirs.length > 0 ? includeDirs.join(', ') : 'none'}\n\n` +
        'To fix this:\n' +
        '  1. Ensure the .proto file exists in one of the search paths\n' +
        '  2. Use absolute paths or adjust baseDir/includeDirs options\n' +
        '  3. For Google types, ensure includeGoogleTypes is true'
      )
    }

    resolvedSchemas.push(schemaContent)
    resolvedPaths.add(importPath)
  }

  return resolvedSchemas
}

/**
 * Create a helpful error message when imports are detected but not being resolved
 * @param {Array} imports - Array of import paths found
 * @returns {Error} Descriptive error with suggestions
 */
function createImportError (imports) {
  const googleImports = imports.filter(imp => imp.startsWith('google/protobuf/'))
  const otherImports = imports.filter(imp => !imp.startsWith('google/protobuf/'))

  let message = 'Found import statements but import resolution is disabled.\n\n'
  message += 'Imports found:\n'
  imports.forEach(imp => {
    message += `  - "${imp}"\n`
  })

  message += '\nTo fix this, choose one of these approaches:\n\n'

  message += '1. Use transpileFromFiles() with import resolution:\n'
  message += '   const schema = pp.transpileFromFiles([\'your-main.proto\'], {\n'
  message += '     resolveImports: true,\n'
  message += '     baseDir: \'./protos\'\n'
  message += '   });\n\n'

  if (googleImports.length > 0) {
    message += '2. For Google well-known types, they\'re included automatically:\n'
    message += '   const schema = pp.transpileFromFiles([\'your-file.proto\'], {\n'
    message += '     resolveImports: true,\n'
    message += '     includeGoogleTypes: true  // This is the default\n'
    message += '   });\n\n'
  }

  message += '3. Manually provide all schemas (current approach):\n'
  message += '   const allSchemas = [\n'
  message += '     fs.readFileSync(\'main.proto\', \'utf8\'),\n'
  imports.forEach(imp => {
    message += `     fs.readFileSync('${imp}', 'utf8'),\n`
  })
  message += '   ];\n'
  message += '   const schema = pp.transpile(allSchemas);\n'

  return new Error(message)
}

module.exports = {
  GOOGLE_WELL_KNOWN_TYPES,
  findImports,
  resolveImports,
  createImportError
}
