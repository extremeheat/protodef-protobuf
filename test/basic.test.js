/* eslint-env mocha */
/**
 * basic.test.js
 * This file tests the entire pipeline with multiple scenarios:
 * 1. A comprehensive proto2 test with all major features.
 * 2. A realistic proto3 test using the new 'protobuf_message' type.
 * 3. A proto2 test demonstrating support for extensions.
 */

const schemaParser = require('protocol-buffers-schema')
const { Compiler: { ProtoDefCompiler } } = require('protodef')
const { transpileProtobufAST, mergeAsts } = require('../src/transpiler.js')
const assert = require('assert')

function createProtoDef (generatedSchema) {
  generatedSchema.protobuf_string = ['pstring', { countType: 'varint' }]
  generatedSchema.protobuf_bytes = ['buffer', { countType: 'varint' }]
  const compiler = new ProtoDefCompiler()
  compiler.addTypes(require('../src/datatypes/compiler.js'))
  compiler.addTypesToCompile(generatedSchema)
  const proto = compiler.compileProtoDefSync()
  proto.writeCtx.sizeOfCtx = proto.sizeOfCtx
  return proto
}

describe('protodef-protobuf', () => {
  describe('Proto2 Comprehensive Test', () => {
    it('should handle proto2 schema with all major features', () => {
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

      const ast = schemaParser.parse(proto2Content)
      const generatedSchema = transpileProtobufAST(ast)
      const proto = createProtoDef(generatedSchema)

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

      const buffer = proto.createPacketBuffer(mainType, packetData)
      const result = proto.parsePacketBuffer(mainType, buffer)
      assert.deepStrictEqual(packetData, result.data, 'Proto2 data does not match!')
    })
  })

  describe('Encapsulated Proto3 Test', () => {
    it('should handle encapsulated proto3 messages', () => {
      const proto3Content = `
        syntax = "proto3";
        package my.app;

        message AppMessage {
          string user_id = 1;
          repeated int32 event_codes = 2;
        }
      `

      const ast = schemaParser.parse(proto3Content)
      const generatedSchema = transpileProtobufAST(ast)

      // Our main protocol now uses the new 'protobuf_message' type
      const mainProtocol = {
        packet: ['protobuf_message', {
          lengthType: 'varint',
          type: 'my_app_AppMessage'
        }]
      }

      const proto = createProtoDef({ ...generatedSchema, ...mainProtocol })

      const mainType = 'packet'
      const packetData = {
        user_id: 'user-123',
        event_codes: [50, 100, 150]
      }

      const buffer = proto.createPacketBuffer(mainType, packetData)
      const result = proto.parsePacketBuffer(mainType, buffer)
      assert.deepStrictEqual(packetData, result.data, 'Encapsulated Proto3 data does not match!')
    })
  })

  describe('Proto2 Extensions Test', () => {
    it('should handle proto2 extensions', () => {
      const baseContent = `
        syntax = "proto2";
        package my.game;

        message Player {
          extensions 100 to 199;
          required int32 id = 1;
        }
      `
      const extContent = `
        syntax = "proto2";
        package my.game;

        extend Player {
          optional string name = 100;
        }
      `
      const baseAst = schemaParser.parse(baseContent)
      const extAst = schemaParser.parse(extContent)
      const mergedAst = mergeAsts([baseAst, extAst])
      const generatedSchema = transpileProtobufAST(mergedAst)
      const proto = createProtoDef(generatedSchema)

      const mainType = 'my_game_Player'
      const packetData = {
        id: 456,
        name: 'ExtendedPlayer'
      }

      const buffer = proto.createPacketBuffer(mainType, packetData)
      const result = proto.parsePacketBuffer(mainType, buffer)
      assert.deepStrictEqual(packetData, result.data, 'Proto2 extensions data does not match!')
    })
  })

  describe('External API Test', () => {
    it('should work with the public API as shown in README and examples', () => {
      // Use the external API from protodef-protobuf
      const pp = require('../src/index.js')

      // Test the transpile function with a simple schema
      const schema = `
        syntax = "proto3";
        package chat;

        message ChatMessage {
          string user_id = 1;
          string content = 2;
          int64 timestamp = 3;
          repeated string tags = 4;
        }
      `

      // Transpile using the public API
      const generatedSchema = pp.transpile([schema])

      // Verify the generated schema has expected keys
      assert(generatedSchema.chat_ChatMessage, 'Generated schema should contain chat_ChatMessage type')

      // Create a protocol definition using the protobuf_message container
      const protocol = {
        ...generatedSchema,
        packet_hello: ['protobuf_message', {
          lengthType: 'varint',
          type: 'chat_ChatMessage'
        }]
      }

      // Use the external API to set up the compiler
      const compiler = new ProtoDefCompiler()
      pp.addTypesToCompiler(compiler) // Add custom types
      compiler.addTypesToCompile(protocol)
      const proto = compiler.compileProtoDefSync()

      // Test data
      const helloPacket = {
        user_id: 'user123',
        content: 'Hello, world!',
        timestamp: BigInt(1234567890),
        tags: ['greeting', 'test']
      }

      // Test encoding and decoding
      const encoded = proto.createPacketBuffer('packet_hello', helloPacket)
      assert(Buffer.isBuffer(encoded), 'Should return a buffer')
      assert(encoded.length > 0, 'Buffer should not be empty')

      const decoded = proto.parsePacketBuffer('packet_hello', encoded)
      assert.deepStrictEqual(decoded.data, helloPacket, 'Decoded data should match original')
    })

    it('should handle multiple schemas with extensions using public API', () => {
      const pp = require('../src/index.js')

      // Test with multiple schemas (base + extension)
      const baseSchema = `
        syntax = "proto2";
        package game;

        message Player {
          extensions 100 to 199;
          required int32 id = 1;
          optional string name = 2;
        }
      `

      const extensionSchema = `
        syntax = "proto2";
        package game;

        extend Player {
          optional int32 level = 100;
          optional string guild = 101;
        }
      `

      // Transpile multiple schemas
      const generatedSchema = pp.transpile([baseSchema, extensionSchema])

      // Create protocol
      const protocol = {
        ...generatedSchema,
        player_packet: ['protobuf_message', {
          lengthType: 'varint',
          type: 'game_Player'
        }]
      }

      // Set up compiler
      const compiler = new ProtoDefCompiler()
      pp.addTypesToCompiler(compiler)
      compiler.addTypesToCompile(protocol)
      const proto = compiler.compileProtoDefSync()

      // Test data with extensions
      const playerData = {
        id: 42,
        name: 'TestPlayer',
        level: 15,
        guild: 'TestGuild'
      }

      // Test round-trip
      const encoded = proto.createPacketBuffer('player_packet', playerData)
      const decoded = proto.parsePacketBuffer('player_packet', encoded)
      assert.deepStrictEqual(decoded.data, playerData, 'Extended player data should match')
    })

    it('should expose lower-level modules for advanced use', () => {
      const pp = require('../src/index.js')

      // Test that advanced modules are exposed
      assert(pp.transpiler, 'Should expose transpiler module')
      assert(pp.compiler, 'Should expose compiler module')
      assert(typeof pp.transpiler.transpileProtobufAST === 'function', 'Should expose transpileProtobufAST function')
      assert(typeof pp.transpiler.mergeAsts === 'function', 'Should expose mergeAsts function')
    })
  })

  describe('Bytes Field Test', () => {
    it('should handle protobuf bytes fields correctly', () => {
      const pp = require('../src/index.js')

      // Test schema with bytes fields
      const schema = `
        syntax = "proto3";
        package test;

        message BinaryMessage {
          int32 id = 1;
          bytes data = 2;
          repeated bytes chunks = 3;
        }
      `

      // Transpile using the public API
      const generatedSchema = pp.transpile([schema])

      // Verify the generated schema contains protobuf_bytes
      assert(generatedSchema.test_BinaryMessage, 'Generated schema should contain test_BinaryMessage type')

      // Create protocol
      const protocol = {
        ...generatedSchema,
        binary_packet: ['protobuf_message', {
          lengthType: 'varint',
          type: 'test_BinaryMessage'
        }]
      }

      // Set up compiler
      const compiler = new ProtoDefCompiler()
      pp.addTypesToCompiler(compiler)
      compiler.addTypesToCompile(protocol)
      const proto = compiler.compileProtoDefSync()

      // Test data with binary data
      const binaryData = {
        id: 42,
        data: Buffer.from([0x01, 0x02, 0x03, 0x04, 0xFF]),
        chunks: [
          Buffer.from([0xDE, 0xAD]),
          Buffer.from([0xBE, 0xEF]),
          Buffer.from([0xCA, 0xFE, 0xBA, 0xBE])
        ]
      }

      // Test round-trip
      const encoded = proto.createPacketBuffer('binary_packet', binaryData)
      assert(Buffer.isBuffer(encoded), 'Should return a buffer')
      assert(encoded.length > 0, 'Buffer should not be empty')

      const decoded = proto.parsePacketBuffer('binary_packet', encoded)
      assert.deepStrictEqual(decoded.data, binaryData, 'Binary data should match after round-trip')
    })

    it('should handle bytes fields with interpreter', () => {
      const pp = require('../src/index.js')
      const { ProtoDef } = require('protodef')

      // Test schema with bytes field
      const schema = `
        syntax = "proto3";
        package test;

        message SimpleBytes {
          bytes content = 1;
        }
      `

      // Transpile and set up interpreter
      const generatedSchema = pp.transpile([schema])
      const protodef = new ProtoDef()
      pp.addTypesToInterpreter(protodef)
      protodef.addTypes(generatedSchema)

      // Test data
      const testData = {
        content: Buffer.from('Hello, binary world!', 'utf8')
      }

      // Test round-trip with interpreter
      const encoded = protodef.createPacketBuffer('test_SimpleBytes', testData)
      const decoded = protodef.parsePacketBuffer('test_SimpleBytes', encoded)

      assert.deepStrictEqual(decoded.data, testData, 'Interpreter should handle bytes correctly')
    })
  })
})
