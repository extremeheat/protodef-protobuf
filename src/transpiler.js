// src/transpiler.js
/* eslint-disable camelcase, no-template-curly-in-string */

const WIRE_TYPES = {
  varint: 0,
  zigzag32: 0,
  zigzag64: 0,
  li64: 1,
  lu64: 1,
  lf64: 1,
  string: 2,
  buffer: 2,
  li32: 5,
  lu32: 5,
  lf32: 5
}

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

function processNode (node, prefix, schema, rootAst) {
  const isProto3 = rootAst.syntax === 3

  if (node.messages) {
    for (const message of node.messages) {
      const protodefTypeName = `${prefix}${message.name}`
      const messagePrefixForNesting = `${protodefTypeName}_`

      const fields = message.fields.map(field => {
        // Handle map fields by creating a synthetic message
        if (field.map) {
          const keyType = PROTO_TO_PROTODEF_TYPE_MAP[field.map.from]
          const valueType = PROTO_TO_PROTODEF_TYPE_MAP[field.map.to] || `${prefix}${field.map.to}` // Handle nested message values
          const mapEntryName = `${protodefTypeName}_${field.name}_entry`

          // Define the synthetic key-value pair message for the map entry
          schema[mapEntryName] = ['protobuf_container', [
            { name: 'key', type: keyType, tag: 1 },
            { name: 'value', type: valueType, tag: 2 }
          ]]

          return {
            name: field.name,
            type: mapEntryName,
            tag: field.tag,
            repeated: true, // Maps are always repeated fields
            map: true // Add a flag for context
          }
        }

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

        const fieldOptions = {
          name: field.name,
          type: fieldType,
          tag: field.tag,
          repeated: field.repeated
        }

        if (isProto3) {
          // In proto3, repeated numeric fields are packed by default
          if (field.repeated && WIRE_TYPES[fieldType] !== 2) {
            fieldOptions.packed = field.options.packed ? field.options.packed === 'true' : true
          }
        } else {
          // In proto2, handle explicit required/optional and packed
          fieldOptions.required = field.required
          fieldOptions.packed = field.options ? field.options.packed === 'true' : false
        }

        return fieldOptions
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
  processNode(ast, packagePrefix, protodefSchema, ast)
  return protodefSchema
}

module.exports = { transpileProtobufAST }
