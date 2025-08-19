const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// Define a simple proto3 schema
const schema = `
  syntax = "proto3";
  package chat;

  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

// Transpile the schema
const generatedSchema = pp.transpile([schema])

// Create a protocol that wraps the protobuf message with length framing
const protocol = {
  ...generatedSchema, // Include the generated schema
  packet_hello: ['protobuf_message', {
    lengthType: 'varint', // The message is prefixed with a varint length
    type: 'chat_ChatMessage' // The payload is our Protobuf message
  }]
}

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

console.log('Success! The packet was encoded and decoded correctly.')
