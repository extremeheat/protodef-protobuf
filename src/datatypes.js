/**
 * datatypes.js
 * * This file defines the custom 'protobuf_container' type for node-protodef.
 * This is the runtime component that teaches protodef how to read and write
 * the Protocol Buffers wire format.
 */

const protobuf_container = {
  /**
   * Reads a protobuf-encoded message from the buffer.
   * @param {Buffer} buffer - The buffer to read from.
   * @param {number} offset - The offset to start reading at.
   * @param {Array} fieldsSchema - The schema definition for the fields of this message.
   * @param {object} rootNode - The root protodef instance, used for recursive calls.
   * @returns {{value: object, size: number}} The decoded JS object and the number of bytes read.
   */
  read: (buffer, offset, fieldsSchema, rootNode) => {
    console.log(`Reading 'protobuf_container' at offset ${offset}`)
    // --- NOT IMPLEMENTED ---
    // This is where the core "read tag -> read value" loop will go.
    // For now, we'll return a dummy value and size.
    const dummyValue = {}
    fieldsSchema.forEach(field => {
      // Create a dummy structure based on the schema
      dummyValue[field.name] = field.repeated ? [] : undefined
    })

    console.error('protobuf_container.read is not implemented!')
    return {
      value: dummyValue,
      size: 0 // Returning 0 will likely cause an infinite loop if not handled, but is fine for initial tests.
    }
  },

  /**
   * Writes a JS object to the buffer in protobuf format.
   * @param {object} value - The JS object to serialize.
   * @param {Buffer} buffer - The buffer to write to.
   * @param {number} offset - The offset to start writing at.
   * @param {Array} fieldsSchema - The schema definition for the fields.
   * @param {object} rootNode - The root protodef instance.
   * @returns {number} The new offset after writing the data.
   */
  write: (value, buffer, offset, fieldsSchema, rootNode) => {
    console.log(`Writing 'protobuf_container' at offset ${offset}`)
    // --- NOT IMPLEMENTED ---
    // This is where the serialization logic will go.
    console.error('protobuf_container.write is not implemented!')
    return offset
  },

  /**
   * Calculates the byte size of the JS object when serialized.
   * @param {object} value - The JS object to measure.
   * @param {Array} fieldsSchema - The schema definition for the fields.
   * @param {object} rootNode - The root protodef instance.
   * @returns {number} The calculated size in bytes.
   */
  sizeOf: (value, fieldsSchema, rootNode) => {
    console.log("Calculating sizeOf for 'protobuf_container'")
    // --- NOT IMPLEMENTED ---
    // This is where the size calculation logic will go.
    console.error('protobuf_container.sizeOf is not implemented!')
    return 0
  }
}

module.exports = { protobuf_container }
