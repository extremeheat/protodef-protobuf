/**
 * transpiler.js
 * * This script converts a Protobuf schema AST (from the 'protocol-buffers-schema' package)
 * into a node-protodef compatible JSON schema. It recursively processes messages and enums
 * to handle nested types and package namespaces correctly.
 */

// A mapping from Protobuf types to node-protodef's specific built-in types.
const PROTO_TO_PROTODEF_TYPE_MAP = {
  // VarInt
  int32: 'varint',
  uint32: 'varint',
  int64: 'varint',
  uint64: 'varint',
  bool: 'bool',
  enum: 'varint',

  // ZigZag VarInt
  sint32: 'zigzag32',
  sint64: 'zigzag64',

  // 32-bit Little-Endian
  fixed32: 'lu32',
  sfixed32: 'li32',
  float: 'lf32',

  // 64-bit Little-Endian
  fixed64: 'lu64',
  sfixed64: 'li64',
  double: 'lf64',

  // Length-Delimited
  string: 'string',
  bytes: 'buffer'
}

/**
 * Recursively processes messages and enums from the AST to build the protodef schema.
 * @param {object} node - The current node in the AST (can be the root, or a message).
 * @param {string} prefix - The namespace prefix to apply to type names (e.g., 'my_package_').
 * @param {object} schema - The schema object being built.
 */
function processNode (node, prefix, schema) {
  // Process nested messages
  if (node.messages) {
    for (const message of node.messages) {
      const protodefTypeName = `${prefix}${message.name}`
      const messagePrefixForNesting = `${protodefTypeName}_`

      const fields = message.fields.map(field => {
        let fieldType = PROTO_TO_PROTODEF_TYPE_MAP[field.type]

        if (!fieldType) {
          // FIX: Correctly resolve nested vs. sibling/global types.
          const isNested = (message.messages && message.messages.some(m => m.name === field.type)) ||
                           (message.enums && message.enums.some(e => e.name === field.type))

          if (isNested) {
            // If it's a nested type, its full name is prefixed with the parent message's full name.
            fieldType = `${protodefTypeName}_${field.type}`
          } else {
            // Otherwise, assume it's in the global package scope.
            const globalPrefix = node.package ? node.package.replace(/\./g, '_') + '_' : ''
            fieldType = `${globalPrefix}${field.type}`
          }
        }

        return {
          name: field.name,
          type: fieldType,
          tag: field.tag,
          repeated: field.repeated,
          required: field.required
        }
      })

      schema[protodefTypeName] = ['protobuf_container', fields]

      // Recurse into the nested message to define its own nested types
      processNode(message, messagePrefixForNesting, schema)
    }
  }

  // Process nested enums
  if (node.enums) {
    for (const anEnum of node.enums) {
      const protodefTypeName = `${prefix}${anEnum.name}`
      const mappings = {}
      for (const key in anEnum.values) {
        const numericValue = anEnum.values[key].value
        mappings[numericValue] = key
      }
      schema[protodefTypeName] = ['mapper', { type: 'varint', mappings }]
    }
  }
}

/**
 * Transpiles a Protobuf AST from 'protocol-buffers-schema' into a protodef JSON schema.
 * @param {object} ast - The AST from protocol-buffers-schema.
 * @returns {object} The protodef JSON schema.
 */
function transpileProtobufAST (ast) {
  const protodefSchema = {}
  const packagePrefix = ast.package ? ast.package.replace(/\./g, '_') + '_' : ''
  processNode(ast, packagePrefix, protodefSchema)
  return protodefSchema
}

module.exports = { transpileProtobufAST }
