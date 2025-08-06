/**
 * test.js
 * * This file tests the entire pipeline with multiple scenarios:
 * 1. A comprehensive proto2 test with all major features.
 * 2. A realistic proto3 test using the new 'protobuf_message' type.
 */

const schemaParser = require('protocol-buffers-schema')
const { ProtoDef, Compiler: { ProtoDefCompiler } } = require('protodef')
const { transpileProtobufAST } = require('./transpiler.js')
const assert = require('assert')

// --- Test Case 1: Comprehensive Proto2 Schema ---
const proto2Content = `
  syntax = "proto2";
  package my.game;

  message Player {
    required int32 id = 1;
    optional string name = 2;

    enum PlayerState {
      IDLE = 0;
      ACTIVE = 1;
      BANNED = 2;
    }
    optional PlayerState state = 3;

    message Position {
      required float x = 1;
      required float y = 2;
      required float z = 3;
    }
    optional Position pos = 4;

    repeated int32 items = 5 [packed=true];
    map<string, int32> stats = 6;
  }
`

async function runProto2Test () {
  console.log('--- Running Proto2 Comprehensive Test ---')
  const ast = schemaParser.parse(proto2Content)
  const generatedSchema = transpileProtobufAST(ast)
  generatedSchema.string = ['pstring', { countType: 'varint' }]

  const compiler = new ProtoDefCompiler()
  compiler.addTypes(require('./datatypes_compiler.js'))
  compiler.addTypesToCompile(generatedSchema)
  const proto = compiler.compileProtoDefSync()
  proto.writeCtx.sizeOfCtx = proto.sizeOfCtx

  const mainType = 'my_game_Player'
  const packetData = {
    id: 123,
    name: 'PlayerOne',
    state: 'ACTIVE',
    pos: {
      x: 10.5,
      y: 20.0,
      z: -5.25
    },
    items: [100, 200, 300],
    stats: [
      { key: 'strength', value: 15 },
      { key: 'mana', value: 100 }
    ]
  }

  try {
    const buffer = proto.createPacketBuffer(mainType, packetData)
    const result = proto.parsePacketBuffer(mainType, buffer)
    assert.deepStrictEqual(packetData, result.data, 'Proto2 data does not match!')
    console.log('SUCCESS: Proto2 test passed.\n')
  } catch (e) {
    console.error('\nERROR in Proto2 test:', e.message)
    console.log(e)
  }
}

// --- Test Case 2: Encapsulated Proto3 Schema ---
const proto3Content = `
  syntax = "proto3";
  package my.app;

  message AppMessage {
    string user_id = 1;
    repeated int32 event_codes = 2;
  }
`

async function runEncapsulatedProto3Test () {
  console.log('--- Running Encapsulated Proto3 Test ---')
  const ast = schemaParser.parse(proto3Content)
  const generatedSchema = transpileProtobufAST(ast)
  generatedSchema.string = ['pstring', { countType: 'varint' }]

  // Our main protocol now uses the new 'protobuf_message' type
  const mainProtocol = {
    packet: ['protobuf_message', {
      lengthType: 'varint',
      type: 'my_app_AppMessage'
    }]
  }

  const compiler = new ProtoDefCompiler()
  compiler.addTypes(require('./datatypes_compiler.js'))
  compiler.addTypesToCompile(generatedSchema)
  compiler.addTypesToCompile(mainProtocol)

  const proto = compiler.compileProtoDefSync()
  proto.writeCtx.sizeOfCtx = proto.sizeOfCtx

  const mainType = 'packet'
  const packetData = {
    user_id: 'user-123',
    event_codes: [50, 100, 150]
  }

  try {
    const buffer = proto.createPacketBuffer(mainType, packetData)
    const result = proto.parsePacketBuffer(mainType, buffer)
    assert.deepStrictEqual(packetData, result.data, 'Encapsulated Proto3 data does not match!')
    console.log('SUCCESS: Encapsulated Proto3 test passed.\n')
  } catch (e) {
    console.error('\nERROR in Encapsulated Proto3 test:', e.message)
    console.log(e)
  }
}

// Run both tests
async function runAllTests () {
  await runProto2Test()
  await runEncapsulatedProto3Test()
  console.log('--- All Tests Complete ---')
}

runAllTests()
