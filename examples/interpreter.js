/**
 * interpreter.js
 *
 * This example demonstrates how to use protodef-protobuf with the ProtoDef interpreter
 * instead of the compiler. The interpreter approach is ideal for:
 * - Runtime flexibility
 * - Easier debugging and introspection
 * - Portability to other languages (like Rust)
 * - Dynamic schema handling
 */

const { ProtoDef } = require('protodef')
const pp = require('protodef-protobuf')

// Define a simple protobuf schema
const schema = `
syntax = "proto3";

message Player {
  string name = 1;
  int32 level = 2;
  repeated string items = 3;
  Position position = 4;
}

message Position {
  float x = 1;
  float y = 2;
  float z = 3;
}
`

// Sample data to encode/decode
const playerData = {
  name: 'Alice',
  level: 42,
  items: ['sword', 'shield', 'potion'],
  position: { x: 10.5, y: 20.0, z: 5.5 }
}

console.log('=== ProtoDef Interpreter Example ===\n')

// Step 1: Transpile .proto schema to ProtoDef JSON format
console.log('1. Transpiling schema...')
const protodefSchema = pp.transpile([schema])
console.log('Generated schema keys:', Object.keys(protodefSchema))

// Step 2: Create ProtoDef interpreter instance
console.log('\n2. Setting up interpreter...')
const interpreter = new ProtoDef()

// Step 3: Add protobuf types to the interpreter
pp.addTypesToInterpreter(interpreter)

// Step 4: Add our generated schema
interpreter.addTypes(protodefSchema)

// Step 5: Encode data to binary
console.log('\n3. Encoding data...')
console.log('Original data:', JSON.stringify(playerData, null, 2))

const encodedBuffer = interpreter.createPacketBuffer('Player', playerData)
console.log('Encoded buffer length:', encodedBuffer.length, 'bytes')
console.log('Encoded hex:', encodedBuffer.toString('hex'))

// Step 6: Decode binary back to data
console.log('\n4. Decoding data...')
const decoded = interpreter.parsePacketBuffer('Player', encodedBuffer)
console.log('Decoded data:', JSON.stringify(decoded.data, null, 2))

// Step 7: Verify round-trip accuracy
console.log('\n5. Verification...')
const isIdentical = JSON.stringify(playerData) === JSON.stringify(decoded.data)
console.log('Round-trip successful:', isIdentical ? '✅' : '❌')

// Step 8: Demonstrate low-level API usage
console.log('\n6. Low-level API demonstration...')

// Manual encoding
const buffer = Buffer.alloc(1000)
const bytesWritten = interpreter.write(playerData, buffer, 0, 'Player', {})
const manualEncoded = buffer.slice(0, bytesWritten)
console.log('Manual encode result:', manualEncoded.toString('hex'))

// Manual decoding
const manualDecoded = interpreter.read(manualEncoded, 0, 'Player', {})
console.log('Manual decode size:', manualDecoded.size, 'bytes')
console.log('Manual decode data:', JSON.stringify(manualDecoded.value, null, 2))

// Step 9: Performance and size information
console.log('\n7. Performance info...')
console.log('Binary size:', encodedBuffer.length, 'bytes')
console.log('JSON size:', JSON.stringify(playerData).length, 'bytes')
console.log('Compression ratio:', Math.round((1 - encodedBuffer.length / JSON.stringify(playerData).length) * 100) + '%')

console.log('\n=== Complete! ===')
