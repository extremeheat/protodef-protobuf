// Example demonstrating protobuf bytes field handling
const { ProtoDef } = require('protodef')
const pp = require('../src/index.js')

// Schema with bytes fields
const schema = `
syntax = "proto3";
package example;

message FileData {
  string filename = 1;
  bytes content = 2;
  repeated bytes chunks = 3;
}
`

console.log('=== ProtoBuf Bytes Field Example ===')

// 1. Transpile the schema
console.log('1. Transpiling schema...')
const generatedSchema = pp.transpile([schema])
console.log('Generated types:', Object.keys(generatedSchema))

// 2. Set up interpreter
console.log('2. Setting up interpreter...')
const protodef = new ProtoDef()
pp.addTypesToInterpreter(protodef)
protodef.addTypes(generatedSchema)

// 3. Test data with binary content
console.log('3. Creating test data...')
const fileData = {
  filename: 'binary-file.bin',
  content: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
  chunks: [
    Buffer.from([0x00, 0x01, 0x02, 0x03]),
    Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]),
    Buffer.from([0xDE, 0xAD, 0xBE, 0xEF])
  ]
}

console.log('Original data:')
console.log('- Filename:', fileData.filename)
console.log('- Content:', Array.from(fileData.content).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '))
console.log('- Chunks:', fileData.chunks.map(chunk =>
  Array.from(chunk).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
))

// 4. Encode
console.log('4. Encoding...')
const encoded = protodef.createPacketBuffer('example_FileData', fileData)
console.log('Encoded buffer length:', encoded.length, 'bytes')
console.log('Encoded hex:', encoded.toString('hex'))

// 5. Decode
console.log('5. Decoding...')
const decoded = protodef.parsePacketBuffer('example_FileData', encoded)

// 6. Verify
console.log('6. Verification...')
const success = (
  decoded.data.filename === fileData.filename &&
  decoded.data.content.equals(fileData.content) &&
  decoded.data.chunks.length === fileData.chunks.length &&
  decoded.data.chunks.every((chunk, i) => chunk.equals(fileData.chunks[i]))
)

console.log('Round-trip successful:', success ? '✅' : '❌')

if (success) {
  console.log('Decoded data:')
  console.log('- Filename:', decoded.data.filename)
  console.log('- Content:', Array.from(decoded.data.content).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '))
  console.log('- Chunks:', decoded.data.chunks.map(chunk =>
    Array.from(chunk).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
  ))
}

console.log('=== Complete! ===')
