const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

console.log('=== Multiple Message Types Example ===\n')

// Schema with multiple message types that might be sent in a protocol
const protocolSchema = `
  syntax = "proto3";
  package protocol;

  message LoginRequest {
    string username = 1;
    string password = 2;
    string client_version = 3;
  }
  
  message LoginResponse {
    enum Status {
      SUCCESS = 0;
      INVALID_CREDENTIALS = 1;
      SERVER_FULL = 2;
      MAINTENANCE = 3;
    }
    Status status = 1;
    string session_token = 2;
    string server_message = 3;
  }
  
  message ChatMessage {
    string sender = 1;
    string content = 2;
    int64 timestamp = 3;
    string channel = 4;
  }
  
  message PlayerUpdate {
    string player_id = 1;
    float x = 2;
    float y = 3;
    float z = 4;
    int32 health = 5;
  }
`

// Transpile the schema
const generatedSchema = pp.transpile([protocolSchema])

console.log('Generated message types:', Object.keys(generatedSchema).filter(k => k.includes('protocol_')))

// Create a protocol with multiple packet types
const protocol = {
  ...generatedSchema,
  
  // Different packet types using the same protobuf_message container
  login_request: ['protobuf_message', {
    lengthType: 'varint',
    type: 'protocol_LoginRequest'
  }],
  
  login_response: ['protobuf_message', {
    lengthType: 'varint', 
    type: 'protocol_LoginResponse'
  }],
  
  chat_message: ['protobuf_message', {
    lengthType: 'varint',
    type: 'protocol_ChatMessage'
  }],
  
  player_update: ['protobuf_message', {
    lengthType: 'varint',
    type: 'protocol_PlayerUpdate'
  }]
}

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// Test different message types
console.log('Testing multiple message types...\n')

// 1. Login Request
const loginReq = {
  username: 'testuser',
  password: 'secret123', 
  client_version: '1.0.0'
}

const loginReqEncoded = proto.createPacketBuffer('login_request', loginReq)
const loginReqDecoded = proto.parsePacketBuffer('login_request', loginReqEncoded)
assert.deepStrictEqual(loginReqDecoded.data, loginReq)
console.log('✓ LoginRequest:', loginReq)

// 2. Login Response  
const loginResp = {
  status: 'SUCCESS',
  session_token: 'abc123def456',
  server_message: 'Welcome to the server!'
}

const loginRespEncoded = proto.createPacketBuffer('login_response', loginResp)
const loginRespDecoded = proto.parsePacketBuffer('login_response', loginRespEncoded)
assert.deepStrictEqual(loginRespDecoded.data, loginResp)
console.log('✓ LoginResponse:', loginResp)

// 3. Chat Message
const chatMsg = {
  sender: 'testuser',
  content: 'Hello everyone!',
  timestamp: BigInt(Date.now()),
  channel: 'general'
}

const chatMsgEncoded = proto.createPacketBuffer('chat_message', chatMsg)
const chatMsgDecoded = proto.parsePacketBuffer('chat_message', chatMsgEncoded)
assert.deepStrictEqual(chatMsgDecoded.data, chatMsg)
console.log('✓ ChatMessage:', chatMsg)

// 4. Player Update
const playerUpd = {
  player_id: 'testuser',
  x: 100.5,
  y: 64.0,
  z: -23.5,
  health: 85
}

const playerUpdEncoded = proto.createPacketBuffer('player_update', playerUpd)
const playerUpdDecoded = proto.parsePacketBuffer('player_update', playerUpdEncoded)
assert.deepStrictEqual(playerUpdDecoded.data, playerUpd)
console.log('✓ PlayerUpdate:', playerUpd)

console.log('\n✓ Success! All message types work correctly.')
console.log('✓ This demonstrates how to build a complete protocol with multiple message types.')
console.log('✓ Each message type can be encoded/decoded independently using the same compiler.')
