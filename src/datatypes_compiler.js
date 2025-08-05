// src/datatypes_compiler.js
/* eslint-disable camelcase, no-template-curly-in-string */
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
  const schema = compiler.types[type]
  if (!schema) throw new Error(`Unknown type: ${type}`)
  if (schema[0] === 'container' || schema[0] === 'protobuf_container') return 2
  if (schema[0] === 'mapper') return getWireType(compiler, schema[1].type)
  if (schema[0] === 'pstring') return 2
  throw new Error(`Could not determine wire type for ${type}`)
}

function generateSizeOf (compiler, fields) {
  let code = 'let size = 0;\n'
  for (const field of fields) {
    const fieldVar = `value.${field.name}`
    code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`

    if (field.repeated && field.packed) {
      const packedTag = (field.tag << 3) | 2 // Packed fields are always wire type 2
      code += `  const tagSize = ${compiler.callType(packedTag, 'varint')};\n`
      code += '  let payloadSize = 0;\n'
      code += `  for (const item of ${fieldVar}) {\n`
      code += `    payloadSize += ${compiler.callType('item', field.type)};\n`
      code += '  }\n'
      code += `  size += tagSize + ${compiler.callType('payloadSize', 'varint')} + payloadSize;\n`
    } else {
      const wireType = getWireType(compiler, field.type)
      const tag = (field.tag << 3) | wireType
      const processField = (val) => {
        let fieldCode = `size += ${compiler.callType(tag, 'varint')};\n`
        const schema = compiler.types[field.type]
        if (schema[0] === 'pstring') {
          fieldCode += `size += ${compiler.callType(val, field.type)};\n`
        } else if (wireType === 2) {
          const dataSizeCode = compiler.callType(val, field.type)
          fieldCode += `const dataSize = ${dataSizeCode};\n`
          fieldCode += `size += ${compiler.callType('dataSize', 'varint')};\n`
          fieldCode += 'size += dataSize;\n'
        } else {
          fieldCode += `size += ${compiler.callType(val, field.type)};\n`
        }
        return fieldCode
      }
      if (field.repeated) {
        code += `  for (const item of ${fieldVar}) {\n`
        code += compiler.indent(processField('item'), '    ')
        code += '  }\n'
      } else {
        code += compiler.indent(processField(fieldVar), '  ')
      }
    }
    code += '}\n'
  }
  code += 'return size;'
  return compiler.wrapCode(code)
}

function generateWrite (compiler, fields) {
  let code = ''
  for (const field of fields) {
    const fieldVar = `value.${field.name}`
    code += `if (${fieldVar} !== undefined && ${fieldVar} !== null) {\n`

    if (field.repeated && field.packed) {
      const packedTag = (field.tag << 3) | 2 // Packed fields are always wire type 2
      code += `  offset = ${compiler.callType(packedTag, 'varint')};\n`
      code += '  let payloadSize = 0;\n'
      code += `  for (const item of ${fieldVar}) { payloadSize += ctx.sizeOfCtx['${field.type}'](item); }\n`
      code += `  offset = ${compiler.callType('payloadSize', 'varint')};\n`
      code += `  for (const item of ${fieldVar}) { offset = ${compiler.callType('item', field.type)}; }\n`
    } else {
      const wireType = getWireType(compiler, field.type)
      const tag = (field.tag << 3) | wireType
      const processField = (val) => {
        let fieldCode = `offset = ${compiler.callType(tag, 'varint')};\n`
        const schema = compiler.types[field.type]
        if (schema[0] === 'pstring') {
          fieldCode += `offset = ${compiler.callType(val, field.type)};\n`
        } else if (wireType === 2) {
          const dataSizeCode = `ctx.sizeOfCtx['${field.type}'](${val})`
          fieldCode += `const dataSize = ${dataSizeCode};\n`
          fieldCode += `offset = ${compiler.callType('dataSize', 'varint')};\n`
          fieldCode += `offset = ${compiler.callType(val, field.type)};\n`
        } else {
          fieldCode += `offset = ${compiler.callType(val, field.type)};\n`
        }
        return fieldCode
      }
      if (field.repeated) {
        code += `  for (const item of ${fieldVar}) {\n`
        code += compiler.indent(processField('item'), '    ')
        code += '  }\n'
      } else {
        code += compiler.indent(processField(fieldVar), '  ')
      }
    }
    code += '}\n'
  }
  code += 'return offset;'
  return compiler.wrapCode(code)
}

function generateRead (compiler, fields) {
  let code = 'const result = {};\n'
  code += 'let fieldValue, fieldSize, len, lenSize;\n'
  code += 'const endOffset = size === undefined ? buffer.length : offset + size;\n'
  code += 'const initialOffset = offset;\n'
  code += 'while (offset < endOffset) {\n'
  code += '  if (offset >= endOffset) break;\n'
  code += '  const { value: tag, size: tagSize } = ctx.varint(buffer, offset); offset += tagSize;\n'
  code += '  const fieldNumber = tag >> 3;\n'
  code += '  const wireType = tag & 7;\n'
  code += '  switch (fieldNumber) {\n'

  for (const field of fields) {
    code += `    case ${field.tag}:\n`
    let readCode = ''
    const schema = compiler.types[field.type]

    if (field.repeated && field.packed) {
      readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
      readCode += '({ value: len, size: lenSize } = ctx.varint(buffer, offset)); offset += lenSize;\n'
      readCode += 'const packedEnd = offset + len;\n'
      readCode += 'while (offset < packedEnd) {\n'
      readCode += `  ({ value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'offset')});\n`
      readCode += '  offset += fieldSize;\n'
      readCode += `  result.${field.name}.push(fieldValue);\n`
      readCode += '}\n'
    } else if (schema[0] === 'pstring') {
      readCode += `({ value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'offset')});\n`
      readCode += 'offset += fieldSize;\n'
      if (field.repeated) {
        readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
        readCode += `result.${field.name}.push(fieldValue);\n`
      } else {
        readCode += `result.${field.name} = fieldValue;\n`
      }
    } else if (getWireType(compiler, field.type) === 2) {
      readCode += '({ value: len, size: lenSize } = ctx.varint(buffer, offset)); offset += lenSize;\n'
      // Use the direct call to avoid the compiler's variable renaming bug.
      readCode += `({ value: fieldValue, size: fieldSize } = ctx.${field.type}(buffer, offset, len, offset));\n`
      readCode += 'offset += len;\n'
      if (field.repeated) {
        readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
        readCode += `result.${field.name}.push(fieldValue);\n`
      } else {
        readCode += `result.${field.name} = fieldValue;\n`
      }
    } else {
      readCode += `({ value: fieldValue, size: fieldSize } = ${compiler.callType(field.type, 'offset')});\n`
      readCode += 'offset += fieldSize;\n'
      if (field.repeated) {
        readCode += `if (result.${field.name} === undefined) result.${field.name} = [];\n`
        readCode += `result.${field.name}.push(fieldValue);\n`
      } else {
        readCode += `result.${field.name} = fieldValue;\n`
      }
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
  code += 'return { value: result, size: offset - initialOffset };'
  return compiler.wrapCode(code, ['size', 'oldOffset'])
}

module.exports = {
  Read: { protobuf_container: ['parametrizable', generateRead] },
  Write: { protobuf_container: ['parametrizable', generateWrite] },
  SizeOf: { protobuf_container: ['parametrizable', generateSizeOf] }
}
