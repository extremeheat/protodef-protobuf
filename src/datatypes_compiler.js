// src/datatypes_compiler.js
// Implementation for the protobuf_container compiler (parameterizable) type

// A map from protodef types to their corresponding protobuf wire type.
const WIRE_TYPES = {
  varint: 0,
  zigzag32: 0,
  zigzag64: 0,
  // 64-bit types
  li64: 1,
  lu64: 1,
  lf64: 1,
  // Length-delimited types
  string: 2,
  buffer: 2,
  // 32-bit types
  li32: 5,
  lu32: 5,
  lf32: 5
}

function getWireType (compiler, type) {
  if (WIRE_TYPES[type] !== undefined) return WIRE_TYPES[type]
  // For complex types like nested messages or mappers, the underlying type determines the wire type.
  console.log('Compiler', compiler.types)
  const schema = compiler.types[type]
  if (!schema) throw new Error(`Unknown type: ${type}`)
  if (schema[0] === 'container' || schema[0] === 'protobuf_container') return 2 // Nested messages are length-delimited
  if (schema[0] === 'mapper') return getWireType(compiler, schema[1].type) // Look at the mapper's underlying type
  throw new Error(`Could not determine wire type for ${type}`)
}

function generateSizeOf (compiler, fields) {
  let code = 'let size = 0;\n'
  for (const field of fields) {
    const wireType = getWireType(compiler, field.type)
    const tag = (field.tag << 3) | wireType
    const fieldVar = `value.${field.name}`

    const processField = (val) => {
      let fieldCode = `size += ${compiler.callType('varint', tag)};\n`
      if (wireType === 2) { // Length-delimited
        fieldCode += `const dataSize = ${compiler.callType(field.type, val)};\n`
        fieldCode += `size += ${compiler.callType('varint', 'dataSize')};\n`
        fieldCode += 'size += dataSize;\n'
      } else {
        fieldCode += `size += ${compiler.callType(field.type, val)};\n`
      }
      return fieldCode
    }

    if (field.repeated) {
      code += `if (${fieldVar} !== undefined) {\n`
      code += ` for (const item of ${fieldVar}) {\n`
      code += compiler.indent(processField('item'), 2)
      code += ' }\n'
      code += '}\n'
    } else {
      code += `if (${fieldVar} !== undefined) {\n`
      code += compiler.indent(processField(fieldVar))
      code += '}\n'
    }
  }
  code += 'return size;'
  return compiler.wrapCode(code)
}

function generateWrite (compiler, fields) {
  let code = ''
  for (const field of fields) {
    const wireType = getWireType(compiler, field.type)
    const tag = (field.tag << 3) | wireType
    const fieldVar = `value.${field.name}`

    const processField = (val) => {
      let fieldCode = `offset = ${compiler.callWrite('varint', tag, 'offset')};\n`
      if (wireType === 2) { // Length-delimited
        fieldCode += `const dataSize = ${compiler.callType(field.type, val)};\n`
        fieldCode += `offset = ${compiler.callWrite('varint', 'dataSize', 'offset')};\n`
        fieldCode += `offset = ${compiler.callWrite(field.type, val, 'offset')};\n`
      } else {
        fieldCode += `offset = ${compiler.callWrite(field.type, val, 'offset')};\n`
      }
      return fieldCode
    }

    if (field.repeated) {
      code += `if (${fieldVar} !== undefined) {\n`
      code += ` for (const item of ${fieldVar}) {\n`
      code += compiler.indent(processField('item'), 2)
      code += ' }\n'
      code += '}\n'
    } else {
      code += `if (${fieldVar} !== undefined) {\n`
      code += compiler.indent(processField(fieldVar))
      code += '}\n'
    }
  }
  code += 'return offset;'
  return compiler.wrapCode(code)
}

function generateRead (compiler, fields) {
  let code = 'const result = {};\n'
  code += 'const endOffset = offset + size;\n'
  code += 'while (offset < endOffset) {\n'
  code += '  const { value: tag, size: tagSize } = ctx.varint.read(buffer, offset); offset += tagSize;\n'
  code += '  const fieldNumber = tag >> 3;\n'
  code += '  const wireType = tag & 7;\n'
  code += '  switch (fieldNumber) {\n'

  for (const field of fields) {
    code += `    case ${field.tag}:\n`
    let readCode = ''
    const wireType = getWireType(compiler, field.type)
    if (wireType === 2) { // Length-delimited
      readCode += 'const { value: len, size: lenSize } = ctx.varint.read(buffer, offset); offset += lenSize;\n'
      readCode += `const { value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'len', 'offset')};\n`
    } else {
      readCode += `const { value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, undefined, 'offset')};\n`
    }
    readCode += 'offset += fieldSize;\n'
    if (field.repeated) {
      readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
      readCode += `result.${field.name}.push(fieldValue);\n`
    } else {
      readCode += `result.${field.name} = fieldValue;\n`
    }
    code += compiler.indent(readCode, 3)
    code += '      break;\n'
  }

  code += '    default:\n'
  // Simplified skip logic for unknown fields
  code += '      console.warn(`Skipping unknown field with tag ${fieldNumber} and wire type ${wireType}`);\n'
  code += '      if (wireType === 0) { offset += ctx.varint.read(buffer, offset).size; }\n'
  code += '      else if (wireType === 1) { offset += 8; }\n'
  code += '      else if (wireType === 2) { const { value: len, size: lenSize } = ctx.varint.read(buffer, offset); offset += lenSize + len; }\n'
  code += '      else if (wireType === 5) { offset += 4; }\n'
  code += '      break;\n'
  code += '  }\n'
  code += '}\n'
  code += 'return { value: result, size: offset - oldOffset };'
  return compiler.wrapCode(code, ['size', 'oldOffset'])
}

module.exports = {
  Read: { protobuf_container: ['parametrizable', generateRead] },
  Write: { protobuf_container: ['parametrizable', generateWrite] },
  SizeOf: { protobuf_container: ['parametrizable', generateSizeOf] }
}
