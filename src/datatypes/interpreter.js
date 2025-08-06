/* eslint-disable camelcase */
/**
 * src/datatypes/interpreter.js
 *
 * Interpreter version of protobuf datatypes for node-protodef.
 * This implementation is designed to be easily portable to Rust.
 *
 * Key design principles:
 * - Pure algorithmic logic (no code generation)
 * - Minimal dependencies on JavaScript-specific features
 * - Clear separation of concerns
 * - Direct execution suitable for Rust translation
 */

const { WIRE_TYPES } = require('../util.js')

function readProtobufContainer (buffer, offset, typeArgs, context, size) {
  const result = {}
  let currentOffset = offset
  const endOffset = size === undefined ? buffer.length : offset + size

  while (currentOffset < endOffset) {
    if (currentOffset >= endOffset) break

    // Read and parse the field tag
    const { value: tag, size: tagSize } = this.read(buffer, currentOffset, 'varint', result)
    currentOffset += tagSize

    const fieldNumber = tag >> 3
    const wireType = tag & 7

    // Find field definition
    const field = typeArgs.find(f => f.tag === fieldNumber)

    if (!field) {
      // Skip unknown fields
      let skipSize = 0
      if (wireType === 0) { // varint
        const { size } = this.read(buffer, currentOffset, 'varint', result)
        skipSize = size
      } else if (wireType === 1) { // 64-bit
        skipSize = 8
      } else if (wireType === 2) { // length-delimited
        const { value: len, size: lenSize } = this.read(buffer, currentOffset, 'varint', result)
        skipSize = len + lenSize
      } else if (wireType === 5) { // 32-bit
        skipSize = 4
      }
      currentOffset += skipSize
      continue
    }

    // Read field value based on wire type
    let fieldValue, fieldSize
    if (field.repeated && field.packed && wireType === 2) {
      // Packed repeated fields
      const { value: len, size: lenSize } = this.read(buffer, currentOffset, 'varint', result)
      currentOffset += lenSize

      const packedEnd = currentOffset + len
      const values = []

      while (currentOffset < packedEnd) {
        const { value, size } = this.read(buffer, currentOffset, field.type, result)
        currentOffset += size
        values.push(value)
      }

      fieldValue = values
      fieldSize = 0 // currentOffset already advanced during packed reading
    } else if (wireType === 2) {
      // Length-delimited fields (strings, bytes, nested messages)
      const isPstringLike = field.type === 'string' // String fields use pstring encoding
      if (isPstringLike) {
        // pstring-like fields handle their own length prefix
        const readResult = this.read(buffer, currentOffset, field.type, result)
        fieldValue = readResult.value
        fieldSize = readResult.size
      } else {
        // Other length-delimited types need explicit length handling
        const { value: len, size: lenSize } = this.read(buffer, currentOffset, 'varint', result)
        currentOffset += lenSize
        const { value } = this.read(buffer, currentOffset, field.type, result, len)
        fieldValue = value
        fieldSize = lenSize + len
      }
    } else {
      // Fixed-size fields (varints, fixed32, fixed64, etc.)
      const readResult = this.read(buffer, currentOffset, field.type, result)
      fieldValue = readResult.value
      fieldSize = readResult.size
    }

    currentOffset += fieldSize

    // Store the value in the result
    if (field.repeated) {
      if (result[field.name] === undefined) result[field.name] = []
      if (Array.isArray(fieldValue)) {
        // Packed repeated field - add all values
        result[field.name].push(...fieldValue)
      } else {
        // Regular repeated field - add single value
        result[field.name].push(fieldValue)
      }
    } else {
      result[field.name] = fieldValue
    }
  }

  return {
    value: result,
    size: currentOffset - offset
  }
}

function writeProtobufContainer (value, buffer, offset, typeArgs, context) {
  let currentOffset = offset

  for (const field of typeArgs) {
    const fieldValue = value[field.name]

    // Skip undefined/null fields (proto3 semantics)
    if (fieldValue === undefined || fieldValue === null) {
      continue
    }

    // Handle repeated fields
    if (field.repeated) {
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        if (field.packed) {
          // Write as a single packed field
          const packedTag = (field.tag << 3) | 2
          currentOffset = this.write(packedTag, buffer, currentOffset, 'varint', value)

          // Calculate packed payload size
          let payloadSize = 0
          for (const item of fieldValue) {
            payloadSize += this.sizeOf(item, field.type, value)
          }

          // Write payload length then payload data
          currentOffset = this.write(payloadSize, buffer, currentOffset, 'varint', value)
          for (const item of fieldValue) {
            currentOffset = this.write(item, buffer, currentOffset, field.type, value)
          }
        } else {
          // Write each element as a separate field
          for (const item of fieldValue) {
            const isPstringLike = field.type === 'string' // String fields use pstring encoding
            if (isPstringLike) {
              // pstring-like fields handle their own wire format
              const tag = (field.tag << 3) | 2
              currentOffset = this.write(tag, buffer, currentOffset, 'varint', value)
              currentOffset = this.write(item, buffer, currentOffset, field.type, value)
            } else {
              const wireType = WIRE_TYPES[field.type] !== undefined ? WIRE_TYPES[field.type] : 2
              const tag = (field.tag << 3) | wireType
              currentOffset = this.write(tag, buffer, currentOffset, 'varint', value)

              if (wireType === 2) {
                const dataSize = this.sizeOf(item, field.type, value)
                currentOffset = this.write(dataSize, buffer, currentOffset, 'varint', value)
                currentOffset = this.write(item, buffer, currentOffset, field.type, value)
              } else {
                currentOffset = this.write(item, buffer, currentOffset, field.type, value)
              }
            }
          }
        }
      }
    } else {
      // Handle singular fields
      const isPstringLike = field.type === 'string' // String fields use pstring encoding
      if (isPstringLike) {
        // pstring-like fields handle their own wire format (tag + length + data)
        const tag = (field.tag << 3) | 2 // pstring is always wire type 2
        currentOffset = this.write(tag, buffer, currentOffset, 'varint', value)
        currentOffset = this.write(fieldValue, buffer, currentOffset, field.type, value)
      } else {
        // Handle other field types
        const wireType = WIRE_TYPES[field.type] !== undefined ? WIRE_TYPES[field.type] : 2
        const tag = (field.tag << 3) | wireType
        currentOffset = this.write(tag, buffer, currentOffset, 'varint', value)

        if (wireType === 2) {
          // Length-delimited types (but not pstring which handles its own length)
          const dataSize = this.sizeOf(fieldValue, field.type, value)
          currentOffset = this.write(dataSize, buffer, currentOffset, 'varint', value)
          currentOffset = this.write(fieldValue, buffer, currentOffset, field.type, value)
        } else {
          // Fixed-size types
          currentOffset = this.write(fieldValue, buffer, currentOffset, field.type, value)
        }
      }
    }
  }

  return currentOffset
}

function sizeOfProtobufContainer (value, typeArgs, context) {
  let totalSize = 0

  for (const field of typeArgs) {
    const fieldValue = value[field.name]

    // Skip undefined/null fields (proto3 semantics)
    if (fieldValue === undefined || fieldValue === null) {
      continue
    }

    // Handle repeated fields
    if (field.repeated) {
      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        if (field.packed) {
          // Calculate size as a single packed field
          const packedTag = (field.tag << 3) | 2
          totalSize += this.sizeOf(packedTag, 'varint', value)

          // Calculate packed payload size
          let payloadSize = 0
          for (const item of fieldValue) {
            payloadSize += this.sizeOf(item, field.type, value)
          }

          // Add length prefix size and payload size
          totalSize += this.sizeOf(payloadSize, 'varint', value)
          totalSize += payloadSize
        } else {
          // Calculate size of each element as a separate field
          for (const item of fieldValue) {
            const isPstringLike = field.type === 'string' // String fields use pstring encoding
            if (isPstringLike) {
              // pstring-like fields handle their own wire format
              const tag = (field.tag << 3) | 2
              totalSize += this.sizeOf(tag, 'varint', value)
              totalSize += this.sizeOf(item, field.type, value)
            } else {
              const wireType = WIRE_TYPES[field.type] !== undefined ? WIRE_TYPES[field.type] : 2
              const tag = (field.tag << 3) | wireType
              totalSize += this.sizeOf(tag, 'varint', value)

              if (wireType === 2) {
                const dataSize = this.sizeOf(item, field.type, value)
                totalSize += this.sizeOf(dataSize, 'varint', value)
                totalSize += dataSize
              } else {
                totalSize += this.sizeOf(item, field.type, value)
              }
            }
          }
        }
      }
    } else {
      // Handle singular fields
      const isPstringLike = field.type === 'string' // String fields use pstring encoding
      if (isPstringLike) {
        // pstring-like fields handle their own wire format
        const tag = (field.tag << 3) | 2
        totalSize += this.sizeOf(tag, 'varint', value)
        totalSize += this.sizeOf(fieldValue, field.type, value)
      } else {
        const wireType = WIRE_TYPES[field.type] !== undefined ? WIRE_TYPES[field.type] : 2
        const tag = (field.tag << 3) | wireType
        totalSize += this.sizeOf(tag, 'varint', value)

        if (wireType === 2) {
          const dataSize = this.sizeOf(fieldValue, field.type, value)
          totalSize += this.sizeOf(dataSize, 'varint', value)
          totalSize += dataSize
        } else {
          totalSize += this.sizeOf(fieldValue, field.type, value)
        }
      }
    }
  }

  return totalSize
}

// == Protobuf Message Type Definition ===

function readProtobufMessage (buffer, offset, typeArgs, context) {
  let totalSize
  let messageOffset = offset

  if (typeArgs.lengthType) {
    // Read length prefix
    const { value: len, size: lenSize } = this.read(buffer, offset, typeArgs.lengthType, context)
    totalSize = len + lenSize
    messageOffset = offset + lenSize
  } else if (typeArgs.length !== undefined) {
    // Fixed length specified
    totalSize = typeArgs.length
    messageOffset = offset
  } else {
    throw new Error('protobuf_message must have either lengthType or length')
  }

  // Read the actual message
  const messageLength = totalSize - (messageOffset - offset)
  const { value } = this.read(buffer, messageOffset, typeArgs.type, context, messageLength)

  return { value, size: totalSize }
}

function writeProtobufMessage (value, buffer, offset, typeArgs, context) {
  let currentOffset = offset

  if (typeArgs.lengthType) {
    // Calculate payload size and write length prefix
    const payloadSize = this.sizeOf(value, typeArgs.type, context)
    currentOffset = this.write(payloadSize, buffer, currentOffset, typeArgs.lengthType, context)
  }

  // Write the actual message
  currentOffset = this.write(value, buffer, currentOffset, typeArgs.type, context)

  return currentOffset
}

function sizeOfProtobufMessage (value, typeArgs, context) {
  let size = 0
  const payloadSize = this.sizeOf(value, typeArgs.type, context)

  if (typeArgs.lengthType) {
    // Add size of length prefix
    size += this.sizeOf(payloadSize, typeArgs.lengthType, context)
  }

  size += payloadSize
  return size
}

module.exports = {
  protobuf_container: [readProtobufContainer, writeProtobufContainer, sizeOfProtobufContainer],
  protobuf_message: [readProtobufMessage, writeProtobufMessage, sizeOfProtobufMessage]
}
