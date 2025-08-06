const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// Either import from a file like schema.proto or define inline:
const schema = `
  syntax = "proto3";
  package chat;

  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

// If using extensions, you can push to the array with [base, extension1, ...] which'll be merged
const generatedSchema = pp.transpile([schema])

const protocol = {
  ...generatedSchema, // Include the generated schema
  packet_hello: ['protobuf_message', {
    lengthType: 'varint', // The message is prefixed with a varint length
    type: 'chat_ChatMessage' // The payload is our Protobuf message
  }]
}

console.log('Generated Protocol Schema:', protocol)

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler) // Add our custom types
compiler.addTypesToCompile(protocol) // Add the generated schema
const proto = compiler.compileProtoDefSync()

const helloPacket = {
  user_id: 'user123',
  content: 'Hello, world!'
}

const encoded = proto.createPacketBuffer('packet_hello', helloPacket)
console.log('Encoded Buffer:', encoded)

const decoded = proto.parsePacketBuffer('packet_hello', encoded)
assert.deepStrictEqual(decoded.data, helloPacket)
