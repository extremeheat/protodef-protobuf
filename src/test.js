/**
 * test.js
 * * This file tests the entire pipeline:
 * 1. Parses a .proto file string into an AST.
 * 2. Transpiles the AST into a protodef JSON schema.
 * 3. Adds our custom protobuf datatype to a ProtoDef instance.
 * 4. Attempts to use the generated schema to serialize and deserialize data.
 */

const schemaParser = require('protocol-buffers-schema')
const { ProtoDef, Compiler: { ProtoDefCompiler } } = require('protodef')
const { transpileProtobufAST } = require('./transpiler.js')
const assert = require('assert')

// A more complex .proto schema with nested types, enums, packages, and maps.
const protoFileContent = `
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

// The main test execution
async function runTest (useCompiler = true) {
  console.log('--- Step 1: Parsing .proto file content ---')
  const ast = schemaParser.parse(protoFileContent)
  // console.log('AST generated successfully.', JSON.stringify(ast, null, 2))

  console.log('\n--- Step 2: Transpiling AST to protodef schema ---')
  const generatedSchema = transpileProtobufAST(ast)
  // Define 'string' as a pstring with a varint length prefix for protodef
  generatedSchema.string = ['pstring', { countType: 'varint' }]
  console.log('Protodef schema generated.')
  // console.log(JSON.stringify(generatedSchema, null, 2))

  console.log('\n--- Step 3: Setting up ProtoDef instance ---')
  console.log('Adding Types')

  let proto
  if (useCompiler) {
    const compiler = new ProtoDefCompiler()
    compiler.addTypes(require('./datatypes_compiler.js'))
    compiler.addTypesToCompile(generatedSchema)
    proto = compiler.compileProtoDefSync()
    // This is our patch to allow write functions to access sizeOf functions
    proto.writeCtx.sizeOfCtx = proto.sizeOfCtx
  } else {
    // Interpreter path (not fully implemented)
    proto = new ProtoDef()
    proto.addTypes(require('./datatypes.js'))
    proto.addTypes(generatedSchema)
  }
  console.log('ProtoDef instance created and types added.')

  console.log('\n--- Step 4: Attempting to serialize/deserialize ---')

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
    // Protodef doesn't have a native map type, so we represent it as an array of key-value objects
    stats: [
      { key: 'strength', value: 15 },
      { key: 'mana', value: 100 }
    ]
  }

  try {
    console.log('\nAttempting to create packet buffer...')
    const buffer = proto.createPacketBuffer(mainType, packetData)
    console.log(`Buffer created (${buffer.length} bytes): ${buffer.toString('hex')}`)

    console.log('\nAttempting to parse packet buffer...')
    const result = proto.parsePacketBuffer(mainType, buffer)
    console.log('Packet parsed successfully.')
    console.log('Parsed Data:', JSON.stringify(result.data, null, 2))

    // Basic validation
    assert.deepStrictEqual(packetData, result.data, 'Serialized and deserialized data do not match!')
    console.log('\nSUCCESS: Data matches perfectly!')
  } catch (e) {
    console.error('\nAn error occurred during serialization/deserialization:')
    console.log(e)
  }

  console.log('\n--- Test Complete ---')
}

runTest()
