// src/datatypes_compiler.js
// Implementation for the protobuf_container compiler (parameterizable) type

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

function getWireType (compiler, type) {
  if (WIRE_TYPES[type] !== undefined) return WIRE_TYPES[type]
  // console.log('Compiler', compiler.types)
  const schema = compiler.types[type]
  if (!schema) throw new Error(`Unknown type: ${type}`)
  if (schema[0] === 'container' || schema[0] === 'protobuf_container') return 2
  if (schema[0] === 'mapper') return getWireType(compiler, schema[1].type)
  throw new Error(`Could not determine wire type for ${type}`)
}

function generateSizeOf (compiler, fields) {
  let code = 'let size = 0;\n'
  for (const field of fields) {
    const wireType = getWireType(compiler, field.type)
    const tag = (field.tag << 3) | wireType
    const fieldVar = `value.${field.name}`

    const processField = (val) => {
      let fieldCode = `size += ${compiler.callType(tag, 'varint')};\n`
      if (wireType === 2) { // Length-delimited
        fieldCode += `const dataSize = ${compiler.callType(val, field.type)}; /*field.type=${field.type}*/\n`
        fieldCode += `size += ${compiler.callType('dataSize', 'varint')};\n`
        fieldCode += 'size += dataSize;\n'
      } else {
        fieldCode += `size += ${compiler.callType(val, field.type)};\n`
      }
      return fieldCode
    }

    if (field.repeated) {
      code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`
      code += `  for (const item of ${fieldVar}) {\n`
      code += compiler.indent(processField('item'), '  ')
      code += '  }\n'
      code += '}\n'
    } else {
      code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`
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
      let fieldCode = `offset = ${compiler.callType(tag, 'varint')};\n`
      if (wireType === 2) { // Length-delimited
        // Use the injected sizeOf context
        fieldCode += `const dataSize = ctx.sizeOfCtx['${field.type}'](${val});\n`
        fieldCode += `offset = ${compiler.callType('dataSize', 'varint')};\n`
        fieldCode += `offset = ${compiler.callType(val, field.type)};\n`
      } else {
        fieldCode += `offset = ${compiler.callType(val, field.type)};\n`
      }
      return fieldCode
    }

    if (field.repeated) {
      code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`
      code += `  for (const item of ${fieldVar}) {\n`
      code += compiler.indent(processField('item'), '  ')
      code += '  }\n'
      code += '}\n'
    } else {
      code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`
      code += compiler.indent(processField(fieldVar))
      code += '}\n'
    }
  }
  code += 'return offset;'
  return compiler.wrapCode(code)
}

function generateRead (compiler, fields) {
  let code = 'const result = {};\n'
  // FIX: Declare re-assignable variables outside the switch statement
  code += 'let fieldValue, fieldSize, len, lenSize;\n'
  code += 'const endOffset = offset + size;\n'
  code += 'while (offset < endOffset) {\n'
  code += '  if (offset >= endOffset) break;\n'
  code += '  const { value: tag, size: tagSize } = ctx.varint(buffer, offset); offset += tagSize;\n'
  code += '  const fieldNumber = tag >> 3;\n'
  code += '  const wireType = tag & 7;\n'
  code += '  switch (fieldNumber) {\n'

  for (const field of fields) {
    code += `    case ${field.tag}:\n`
    let readCode = ''
    const currentWireType = getWireType(compiler, field.type)

    // FIX: Use destructuring assignment to an existing variable, not a const declaration
    if (currentWireType === 2) { // Length-delimited
      readCode += '({ value: len, size: lenSize } = ctx.varint(buffer, offset)); offset += lenSize;\n'
      // FIX: Manually call the correct pstring reader for the 'string' type
      if (field.type === 'string') {
        readCode += `({ value: fieldValue, size: fieldSize } = ctx.pstring(buffer, offset, { countType: ctx.varint, count: len }));\n`
      } else {
        readCode += `({ value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'offset', ['len'])});\n`
      }
      readCode += 'offset += len;\n'
    } else {
      readCode += `({ value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'offset')});\n`
      readCode += 'offset += fieldSize;\n'
    }
    if (field.repeated) {
      readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
      readCode += `result.${field.name}.push(fieldValue);\n`
    } else {
      readCode += `result.${field.name} = fieldValue;\n`
    }
    code += compiler.indent(readCode, '    ')
    code += '      break;\n'
  }

  code += '    default:\n'
  code += '      console.warn(`Skipping unknown field with tag ${fieldNumber} and wire type ${wireType}`);\n'
  code += '      if (wireType === 0) { const { size } = ctx.varint(buffer, offset); offset += size; }\n'
  code += '      else if (wireType === 1) { offset += 8; }\n'
  code += '      else if (wireType === 2) { ({ value: len, size: lenSize } = ctx.varint(buffer, offset)); offset += lenSize + len; }\n'
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
