/**
 * transpiler.js
 * * This script converts a Protobuf schema AST (from the 'protocol-buffers-schema' package)
 * into a node-protodef compatible JSON schema. It recursively processes messages and enums
 * to handle nested types and package namespaces correctly.
 */

const PROTO_TO_PROTODEF_TYPE_MAP = {
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

function processNode (node, prefix, schema, globalAst) {
  const rootAst = globalAst || node

  if (node.messages) {
    for (const message of node.messages) {
      const protodefTypeName = `${prefix}${message.name}`
      const messagePrefixForNesting = `${protodefTypeName}_`

      const fields = message.fields.map(field => {
        let fieldType = PROTO_TO_PROTODEF_TYPE_MAP[field.type]

        if (!fieldType) {
          const isNested = (message.messages && message.messages.some(m => m.name === field.type)) ||
                           (message.enums && message.enums.some(e => e.name === field.type))

          if (isNested) {
            fieldType = `${protodefTypeName}_${field.type}`
          } else {
            const globalPrefix = rootAst.package ? rootAst.package.replace(/\./g, '_') + '_' : ''
            fieldType = `${globalPrefix}${field.type}`
          }
        }

        return {
          name: field.name,
          type: fieldType,
          tag: field.tag,
          repeated: field.repeated,
          required: field.required,
          // FIX: Correctly parse the 'packed' option from the AST
          packed: field.options ? field.options.packed === 'true' : false
        }
      })

      schema[protodefTypeName] = ['protobuf_container', fields]
      processNode(message, messagePrefixForNesting, schema, rootAst)
    }
  }

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

function transpileProtobufAST (ast) {
  const protodefSchema = {}
  const packagePrefix = ast.package ? ast.package.replace(/\./g, '_') + '_' : ''
  processNode(ast, packagePrefix, protodefSchema)
  return protodefSchema
}

module.exports = { transpileProtobufAST }
