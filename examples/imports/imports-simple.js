const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

console.log('=== Import Resolution - Simple Example ===\n')

// This example demonstrates import resolution with Google well-known types
// For complex cross-package imports, use the manual approach shown at the end

const simpleProto = `
syntax = "proto3";
package example;

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

message SimpleMessage {
  string name = 1;
  google.protobuf.Timestamp created_at = 2;
  google.protobuf.Empty empty_field = 3;
}
`

console.log('📝 Schema with Google imports:')
console.log(simpleProto)

try {
  // Method 1: Using transpileFromFiles (for single files with Google imports)
  console.log('=== Method 1: transpileFromFiles() ===')

  const fs = require('fs')
  const path = require('path')

  const tempDir = path.join(__dirname, 'temp_simple')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  fs.writeFileSync(path.join(tempDir, 'simple.proto'), simpleProto)

  const schema1 = pp.transpileFromFiles(['simple.proto'], {
    baseDir: tempDir,
    resolveImports: true
  })

  console.log('✅ transpileFromFiles result:')
  Object.keys(schema1).forEach(type => {
    console.log(`  ${type}`)
  })

  // Method 2: Using transpile with Google types manually
  console.log('\n=== Method 2: Manual with Google types ===')

  const googleTimestamp = `
    syntax = "proto3";
    package google.protobuf;
    message Timestamp {
      int64 seconds = 1;
      int32 nanos = 2;
    }
  `

  const googleEmpty = `
    syntax = "proto3";
    package google.protobuf;
    message Empty {
    }
  `

  const schema2 = pp.transpile([googleTimestamp, googleEmpty, simpleProto], {
    allowImports: true
  })

  console.log('✅ Manual approach result:')
  Object.keys(schema2).forEach(type => {
    console.log(`  ${type}`)
  })

  // Test encoding/decoding
  console.log('\n=== Testing Encoding/Decoding ===')

  const protocol = {
    ...schema1,
    test_packet: ['protobuf_message', {
      lengthType: 'varint',
      type: 'example_SimpleMessage'
    }]
  }

  const compiler = new ProtoDefCompiler()
  pp.addTypesToCompiler(compiler)
  compiler.addTypesToCompile(protocol)
  const proto = compiler.compileProtoDefSync()

  const testData = {
    name: 'Test Message',
    created_at: {
      seconds: BigInt(1692364800), // Example timestamp
      nanos: 123456
    },
    empty_field: {} // Empty message
  }

  const encoded = proto.createPacketBuffer('test_packet', testData)
  const decoded = proto.parsePacketBuffer('test_packet', encoded)

  console.log('✅ Encoding/Decoding successful!')
  console.log(`   Name: ${decoded.data.name}`)
  console.log(`   Timestamp seconds: ${decoded.data.created_at.seconds}`)

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true })
} catch (error) {
  console.log('❌ Error:', error.message)
}

console.log('\n=== Recommendations ===')
console.log('✅ Use transpileFromFiles() for Google well-known types')
console.log('✅ Use manual transpile() with allowImports for complex cross-package scenarios')
console.log('📚 See examples/imports.js for more complex scenarios')
