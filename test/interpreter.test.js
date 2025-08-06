/* eslint-env mocha */
/**
 * interpreter.test.js
 * Tests the interpreter implementation of protobuf datatypes.
 * This validates that the interpreter version produces the same results as the compiler version.
 */

const { ProtoDef } = require('protodef')
const { Compiler: { ProtoDefCompiler } } = require('protodef')
const pp = require('../src/index.js')
const assert = require('assert')

describe('Interpreter Implementation', () => {
  const schema = `
    syntax = "proto3";
    package test;
    
    message SimpleMessage {
      string name = 1;
      int32 value = 2;
      repeated int32 numbers = 3;
    }
  `

  it('should produce the same results as compiler version', () => {
    const generatedSchema = pp.transpile([schema])

    // Test data
    const testData = {
      name: 'test',
      value: 42,
      numbers: [1, 2, 3, 4, 5]
    }

    // Create compiler version
    const compiler = new ProtoDefCompiler()
    pp.addTypesToCompiler(compiler)
    compiler.addTypesToCompile(generatedSchema)
    const compiledProto = compiler.compileProtoDefSync()

    // Create interpreter version
    const interpreter = new ProtoDef()
    pp.addTypesToInterpreter(interpreter)
    interpreter.addTypes(generatedSchema)

    // Test both versions produce the same binary output
    const compiledBuffer = compiledProto.createPacketBuffer('test_SimpleMessage', testData)
    const interpretedBuffer = interpreter.createPacketBuffer('test_SimpleMessage', testData)

    assert(Buffer.isBuffer(compiledBuffer), 'Compiler should produce a buffer')
    assert(Buffer.isBuffer(interpretedBuffer), 'Interpreter should produce a buffer')
    assert(compiledBuffer.equals(interpretedBuffer), 'Both versions should produce identical binary output')

    // Test both versions can parse the same data
    const compiledResult = compiledProto.parsePacketBuffer('test_SimpleMessage', compiledBuffer)
    const interpretedResult = interpreter.parsePacketBuffer('test_SimpleMessage', interpretedBuffer)

    assert.deepStrictEqual(compiledResult.data, testData, 'Compiler should parse data correctly')
    assert.deepStrictEqual(interpretedResult.data, testData, 'Interpreter should parse data correctly')
    assert.deepStrictEqual(compiledResult.data, interpretedResult.data, 'Both versions should parse to the same result')
  })

  it('should handle protobuf_message container with interpreter', () => {
    const generatedSchema = pp.transpile([schema])

    // Create protocol with protobuf_message wrapper
    const protocol = {
      ...generatedSchema,
      wrapped_message: ['protobuf_message', {
        lengthType: 'varint',
        type: 'test_SimpleMessage'
      }]
    }

    const testData = {
      name: 'wrapped',
      value: 123,
      numbers: [10, 20, 30]
    }

    // Test with interpreter
    const interpreter = new ProtoDef()
    pp.addTypesToInterpreter(interpreter)
    interpreter.addTypes(protocol)

    const buffer = interpreter.createPacketBuffer('wrapped_message', testData)
    const result = interpreter.parsePacketBuffer('wrapped_message', buffer)

    assert.deepStrictEqual(result.data, testData, 'Wrapped message should work with interpreter')
  })

  it('should handle packed repeated fields', () => {
    const packedSchema = `
      syntax = "proto3";
      package test;
      
      message PackedMessage {
        repeated int32 packed_numbers = 1 [packed=true];
        repeated string unpacked_strings = 2;
      }
    `

    const generatedSchema = pp.transpile([packedSchema])
    const testData = {
      packed_numbers: [1, 2, 3, 4, 5],
      unpacked_strings: ['a', 'b', 'c']
    }

    // Test with interpreter
    const interpreter = new ProtoDef()
    pp.addTypesToInterpreter(interpreter)
    interpreter.addTypes(generatedSchema)

    const buffer = interpreter.createPacketBuffer('test_PackedMessage', testData)
    const result = interpreter.parsePacketBuffer('test_PackedMessage', buffer)

    assert.deepStrictEqual(result.data, testData, 'Packed fields should work with interpreter')
  })

  it('should handle nested messages', () => {
    const nestedSchema = `
      syntax = "proto3";
      package test;
      
      message Position {
        float x = 1;
        float y = 2;
      }
      
      message Player {
        string name = 1;
        Position pos = 2;
      }
    `

    const generatedSchema = pp.transpile([nestedSchema])
    const testData = {
      name: 'player1',
      pos: {
        x: 10.5,
        y: 20.0
      }
    }

    // Compare compiler vs interpreter
    const compiler = new ProtoDefCompiler()
    pp.addTypesToCompiler(compiler)
    compiler.addTypesToCompile(generatedSchema)
    const compiledProto = compiler.compileProtoDefSync()

    const interpreter = new ProtoDef()
    pp.addTypesToInterpreter(interpreter)
    interpreter.addTypes(generatedSchema)

    const compiledBuffer = compiledProto.createPacketBuffer('test_Player', testData)
    const interpretedBuffer = interpreter.createPacketBuffer('test_Player', testData)

    assert(compiledBuffer.equals(interpretedBuffer), 'Nested messages should produce identical output')

    const compiledResult = compiledProto.parsePacketBuffer('test_Player', compiledBuffer)
    const interpretedResult = interpreter.parsePacketBuffer('test_Player', interpretedBuffer)

    assert.deepStrictEqual(compiledResult.data, interpretedResult.data, 'Nested messages should parse identically')
  })
})
