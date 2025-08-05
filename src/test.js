/**
 * test.js
 * * This file tests the entire pipeline:
 * 1. Parses a .proto file string into an AST.
 * 2. Transpiles the AST into a protodef JSON schema.
 * 3. Adds our custom protobuf datatype to a ProtoDef instance.
 * 4. Attempts to use the generated schema to serialize and deserialize data.
 */

const schemaParser = require('protocol-buffers-schema')
const { ProtoDef } = require('protodef')
const { transpileProtobufAST } = require('./transpiler.js')
const customTypes = require('./datatypes.js')

// A more complex .proto schema with nested types, enums, and packages.
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
  }
`

// The main test execution
async function runTest () {
  console.log('--- Step 1: Parsing .proto file content ---')
  const ast = schemaParser.parse(protoFileContent)
  console.log('AST generated successfully.', JSON.stringify(ast))

  console.log('\n--- Step 2: Transpiling AST to protodef schema ---')
  const generatedSchema = transpileProtobufAST(ast)
  console.log('Protodef schema generated:')
  console.log(JSON.stringify(generatedSchema, null, 2))

  console.log('\n--- Step 3: Setting up ProtoDef instance ---')
  const proto = new ProtoDef()
  proto.addTypes(customTypes) // Add our custom 'protobuf_container'
  proto.addTypes(generatedSchema) // Add the types we just generated
  console.log('ProtoDef instance created and types added.')

  console.log('\n--- Step 4: Attempting to serialize/deserialize ---')

  const mainType = 'my_game_Player'
  const packetData = {
    id: 123,
    name: 'PlayerOne',
    state: 'ACTIVE', // Enums are handled by name
    pos: {
      x: 10.5,
      y: 20.0,
      z: -5.25
    }
  }

  try {
    // This will call our unimplemented sizeOf and write functions
    console.log('\nAttempting to create packet buffer...')
    const buffer = proto.createPacketBuffer(mainType, packetData)
    console.log(`Buffer created (size: ${buffer.length}). This will be 0 until implementation.`)

    // This will call our unimplemented read function
    console.log('\nAttempting to parse packet buffer...')
    const result = proto.parsePacketBuffer(mainType, buffer)
    console.log('Packet parsed successfully (result will be dummy data).')
    console.log('Parsed Data:', JSON.stringify(result.data, null, 2))
  } catch (e) {
    console.error('\nAn error occurred during serialization/deserialization:', e.message)
  }

  console.log('\n--- Test Complete ---')
  console.log('If you see errors from datatypes.js, it means the pipeline is working!')
}

runTest()
