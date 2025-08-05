/**
 * transpiler.js
 * * This script converts a Protobuf schema AST (from the 'protocol-buffers-schema' package)
 * into a node-protodef compatible JSON schema. It recursively processes messages and enums
 * to handle nested types and package namespaces correctly.
 */

// A mapping from Protobuf types to node-protodef's specific built-in types.
// This is crucial for generating a correct schema.
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
      const messagePrefix = `${prefix}${message.name}_`
      const protodefTypeName = `${prefix}${message.name}`

      const fields = message.fields.map(field => {
        let fieldType = PROTO_TO_PROTODEF_TYPE_MAP[field.type]

        // If the type is not a primitive, it's a reference to another message or enum.
        // We must resolve its full name, searching from the current scope outwards.
        // For simplicity here, we assume it's either a primitive or a type defined
        // in the same file, so we prepend the full package prefix.
        if (!fieldType) {
          // This logic could be enhanced to handle complex lookups (e.g., ../OtherType)
          // For now, we assume the full prefix is correct.
          fieldType = `${prefix}${field.type}`
        }

        return {
          name: field.name,
          type: fieldType,
          tag: field.tag,
          repeated: field.repeated,
          required: field.required // proto2 specific
        }
      })

      // Define the message type in the schema using our custom container.
      schema[protodefTypeName] = ['protobuf_container', fields]

      // Recurse into the nested message to define its own nested types
      processNode(message, messagePrefix, schema)
    }
  }

  // Process nested enums
  if (node.enums) {
    for (const anEnum of node.enums) {
      const protodefTypeName = `${prefix}${anEnum.name}`
      const values = {}
      for (const value of anEnum.values) {
        values[value.name] = value.value
      }
      // Protobuf enums are encoded as varints.
      schema[protodefTypeName] = ['enum', { type: 'varint', values }]
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
  // Create a base prefix from the package name.
  const packagePrefix = ast.package ? ast.package.replace(/\./g, '_') + '_' : ''

  // Start the recursive processing from the root of the AST.
  processNode(ast, packagePrefix, protodefSchema)

  return protodefSchema
}

module.exports = { transpileProtobufAST }
