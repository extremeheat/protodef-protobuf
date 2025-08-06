// src/transpiler.js
/* eslint-disable camelcase, no-template-curly-in-string */

const { WIRE_TYPES, PROTO_TO_PROTODEF_TYPE_MAP } = require('./util')

function processFields (fields, message, prefix, rootAst, schema) {
  const isProto3 = rootAst.syntax === 3
  const protodefTypeName = `${prefix}${message.name}`

  return fields.map(field => {
    if (field.map) {
      const keyType = PROTO_TO_PROTODEF_TYPE_MAP[field.map.from]
      const valueType = PROTO_TO_PROTODEF_TYPE_MAP[field.map.to] || `${prefix}${field.map.to}`
      const mapEntryName = `${protodefTypeName}_${field.name}_entry`
      schema[mapEntryName] = ['protobuf_container', [
        { name: 'key', type: keyType, tag: 1 },
        { name: 'value', type: valueType, tag: 2 }
      ]]
      return { name: field.name, type: mapEntryName, tag: field.tag, repeated: true, map: true }
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

    const fieldOptions = { name: field.name, type: fieldType, tag: field.tag, repeated: field.repeated }
    if (isProto3) {
      if (field.repeated && WIRE_TYPES[fieldType] !== 2) {
        fieldOptions.packed = field.options.packed ? field.options.packed === 'true' : true
      }
    } else {
      fieldOptions.required = field.required
      fieldOptions.packed = field.options ? field.options.packed === 'true' : false
    }
    return fieldOptions
  })
}

function processNode (node, prefix, schema, rootAst) {
  if (node.messages) {
    for (const message of node.messages) {
      const protodefTypeName = `${prefix}${message.name}`
      const messagePrefixForNesting = `${protodefTypeName}_`
      const fields = processFields(message.fields, message, prefix, rootAst, schema)
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

  if (ast.extends) {
    for (const extension of ast.extends) {
      const targetTypeName = `${packagePrefix}${extension.name}`
      const targetSchema = protodefSchema[targetTypeName]
      if (!targetSchema) {
        console.warn(`Could not find message ${extension.name} to extend.`)
        continue
      }
      const baseMessageNode = ast.messages.find(m => m.name === extension.name)
      const extensionFields = processFields(extension.message.fields, baseMessageNode, packagePrefix, ast, protodefSchema)
      targetSchema[1].push(...extensionFields)
    }
  }

  return protodefSchema
}

function mergeAsts (asts) {
  const finalAst = { syntax: 2, package: null, messages: [], enums: [], extends: [] }
  for (const ast of asts) {
    finalAst.messages.push(...ast.messages)
    finalAst.enums.push(...ast.enums)
    finalAst.extends.push(...ast.extends)
    if (!finalAst.package && ast.package) finalAst.package = ast.package
  }
  return finalAst
}

module.exports = { transpileProtobufAST, mergeAsts }
