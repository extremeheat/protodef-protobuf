/* eslint-disable camelcase, no-template-curly-in-string */
/**
 * datatypes.js
 * * This file defines the custom 'protobuf_container' type for node-protodef.
 * This is the runtime component that teaches protodef how to read and write
 * the Protocol Buffers wire format.
 */

// A map from protodef types to their corresponding protobuf wire type.
const WIRE_TYPES = {
  varint: 0,
  zigzag32: 0,
  zigzag64: 0,
  // 64-bit types are not fully supported in JS, but we map them for completeness
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
  // Note: bool is handled as varint, and nested messages are dynamically identified as length-delimited.
}

function getWireType (rootNode, type) {
  if (WIRE_TYPES[type] !== undefined) return WIRE_TYPES[type]
  // For complex types like nested messages or mappers, the underlying type determines the wire type.
  const schema = rootNode.types[type]
  if (!schema) throw new Error(`Unknown type: ${type}`)
  if (schema[0] === 'container' || schema[0] === 'protobuf_container') return 2 // Nested messages are length-delimited
  if (schema[0] === 'mapper') return getWireType(rootNode, schema[1].type) // Look at the mapper's underlying type
  throw new Error(`Could not determine wire type for ${type}`)
}

const protobuf_container = {
  /**
   * Reads a protobuf-encoded message from the buffer.
   */
  read: (buffer, offset, fieldsSchema, rootNode) => {
    const result = {}
    let currentOffset = offset
    const endOffset = buffer.length // Read until the end of the given buffer slice

    while (currentOffset < endOffset) {
      const { value: tag, size: tagSize } = rootNode.read(buffer, currentOffset, 'varint', rootNode)
      currentOffset += tagSize

      const fieldNumber = tag >> 3
      const wireType = tag & 7

      const fieldInfo = fieldsSchema.find(f => f.tag === fieldNumber)

      if (!fieldInfo) {
        // Unknown field, need to skip it based on wire type.
        // This is a simplified skip implementation.
        console.warn(`Skipping unknown field with tag ${fieldNumber} and wire type ${wireType}`)
        let skipSize = 0
        if (wireType === 0) { // varint
          const { size } = rootNode.read(buffer, currentOffset, 'varint', rootNode)
          skipSize = size
        } else if (wireType === 1) { // 64-bit
          skipSize = 8
        } else if (wireType === 2) { // length-delimited
          const { value: len, size: lenSize } = rootNode.read(buffer, currentOffset, 'varint', rootNode)
          skipSize = len + lenSize
        } else if (wireType === 5) { // 32-bit
          skipSize = 4
        }
        currentOffset += skipSize
        continue
      }

      let value, size
      if (wireType === 2) { // Length-delimited (string, bytes, nested message)
        const { value: len, size: lenSize } = rootNode.read(buffer, currentOffset, 'varint', rootNode)
        currentOffset += lenSize
        // For nested messages, we pass the sub-buffer to the recursive read
        const readResult = rootNode.read(buffer.slice(currentOffset, currentOffset + len), 0, fieldInfo.type, rootNode)
        value = readResult.value
        size = readResult.size
      } else {
        const readResult = rootNode.read(buffer, currentOffset, fieldInfo.type, rootNode)
        value = readResult.value
        size = readResult.size
      }
      currentOffset += size

      if (fieldInfo.repeated) {
        if (!result[fieldInfo.name]) result[fieldInfo.name] = []
        result[fieldInfo.name].push(value)
      } else {
        result[fieldInfo.name] = value
      }
    }

    return {
      value: result,
      size: currentOffset - offset
    }
  },

  /**
   * Writes a JS object to the buffer in protobuf format.
   */
  write: (value, buffer, offset, fieldsSchema, rootNode) => {
    let currentOffset = offset
    for (const field of fieldsSchema) {
      const fieldValue = value[field.name]
      if (fieldValue === undefined || fieldValue === null) {
        if (field.required) throw new Error(`Missing required field: ${field.name}`)
        continue
      }

      const processField = (val) => {
        const wireType = getWireType(rootNode, field.type)
        const tag = (field.tag << 3) | wireType
        currentOffset = rootNode.write(tag, buffer, currentOffset, 'varint', rootNode)

        if (wireType === 2) { // Length-delimited
          const size = rootNode.sizeOf(val, field.type, rootNode)
          currentOffset = rootNode.write(size, buffer, currentOffset, 'varint', rootNode)
          currentOffset = rootNode.write(val, buffer, currentOffset, field.type, rootNode)
        } else {
          currentOffset = rootNode.write(val, buffer, currentOffset, field.type, rootNode)
        }
      }

      if (field.repeated) {
        fieldValue.forEach(processField)
      } else {
        processField(fieldValue)
      }
    }
    return currentOffset
  },

  /**
   * Calculates the byte size of the JS object when serialized.
   */
  sizeOf: (value, fieldsSchema, rootNode) => {
    let totalSize = 0
    for (const field of fieldsSchema) {
      const fieldValue = value[field.name]
      if (fieldValue === undefined || fieldValue === null) {
        if (field.required) throw new Error(`Missing required field: ${field.name}`)
        continue
      }

      const processField = (val) => {
        const wireType = getWireType(rootNode, field.type)
        const tag = (field.tag << 3) | wireType
        totalSize += rootNode.sizeOf(tag, 'varint', rootNode)

        if (wireType === 2) { // Length-delimited
          const dataSize = rootNode.sizeOf(val, field.type, rootNode)
          totalSize += rootNode.sizeOf(dataSize, 'varint', rootNode) // Size of the length prefix
          totalSize += dataSize // Size of the actual data
        } else {
          totalSize += rootNode.sizeOf(val, field.type, rootNode)
        }
      }

      if (field.repeated) {
        fieldValue.forEach(processField)
      } else {
        processField(fieldValue)
      }
    }
    return totalSize
  }
}

module.export = {
  protobuf_container
}
