const fs = require('fs')
const path = require('path')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

console.log('=== Import Resolution Example ===\n')

// Create example proto files
const exampleDir = path.join(__dirname, 'import_example')
if (!fs.existsSync(exampleDir)) {
  fs.mkdirSync(exampleDir, { recursive: true })
}

// 1. Create common types
const commonProto = `
syntax = "proto3";
package common;

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
}

message Contact {
  string email = 1;
  string phone = 2;
}
`

// 2. Create user schema that imports common and Google types
const userProto = `
syntax = "proto3";
package user;

import "common.proto";
import "google/protobuf/timestamp.proto";

message UserProfile {
  string id = 1;
  string name = 2;
  common.Address address = 3;
  common.Contact contact = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message UserList {
  repeated UserProfile users = 1;
  int32 total_count = 2;
}
`

// Write the files
fs.writeFileSync(path.join(exampleDir, 'common.proto'), commonProto)
fs.writeFileSync(path.join(exampleDir, 'user.proto'), userProto)

console.log('📁 Created example .proto files:')
console.log('  - common.proto (Address, Contact messages)')
console.log('  - user.proto (imports common.proto and google/protobuf/timestamp.proto)')

console.log('\n=== 1. Using transpileFromFiles() with automatic import resolution ===')

try {
  // Use the new transpileFromFiles function
  const schema = pp.transpileFromFiles(['user.proto'], {
    baseDir: exampleDir,
    resolveImports: true,
    includeGoogleTypes: true
  })

  console.log('✅ Success! Generated types:')
  Object.keys(schema).forEach(typeName => {
    console.log(`  ${typeName}`)
  })

  // Create a protocol using the generated schema
  const protocol = {
    ...schema,
    user_packet: ['protobuf_message', {
      lengthType: 'varint',
      type: 'user_UserProfile'
    }]
  }

  // Compile and test
  const compiler = new ProtoDefCompiler()
  pp.addTypesToCompiler(compiler)
  compiler.addTypesToCompile(protocol)
  const proto = compiler.compileProtoDefSync()

  // Test data with imported types
  const userData = {
    id: 'user_123',
    name: 'Alice Johnson',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      country: 'USA'
    },
    contact: {
      email: 'alice@example.com',
      phone: '+1-555-0123'
    },
    created_at: {
      seconds: BigInt(Math.floor(Date.now() / 1000)),
      nanos: 0
    },
    updated_at: {
      seconds: BigInt(Math.floor(Date.now() / 1000)),
      nanos: 0
    }
  }

  const encoded = proto.createPacketBuffer('user_packet', userData)
  const decoded = proto.parsePacketBuffer('user_packet', encoded)

  console.log('\n✅ Encoding/Decoding test successful!')
  console.log(`   Original name: ${userData.name}`)
  console.log(`   Decoded name: ${decoded.data.name}`)
  console.log(`   Address city: ${decoded.data.address.city}`)
  console.log(`   Email: ${decoded.data.contact.email}`)
} catch (error) {
  console.log('❌ Error:', error.message)
}

console.log('\n=== 2. Error handling for missing imports ===')

const badUserProto = `
syntax = "proto3";
package user;

import "nonexistent.proto";
import "another_missing.proto";

message BadUser {
  string name = 1;
  nonexistent.Type field = 2;
}
`

fs.writeFileSync(path.join(exampleDir, 'bad_user.proto'), badUserProto)

try {
  const badSchema = pp.transpileFromFiles(['bad_user.proto'], {
    baseDir: exampleDir,
    resolveImports: true
  })
  console.log('❌ Should have failed!')
} catch (error) {
  console.log('✅ Correctly handled missing import:')
  console.log(`   ${error.message.split('\\n')[0]}`)
}

console.log('\n=== 3. Manual approach still works ===')

try {
  // The old manual approach with allowImports flag
  const manualSchema = pp.transpile([commonProto, userProto], { allowImports: true })
  console.log('✅ Manual approach works with allowImports flag:')
  console.log(`   Generated ${Object.keys(manualSchema).length} types`)
} catch (error) {
  console.log('❌ Manual approach error:', error.message)
}

// Cleanup
fs.rmSync(exampleDir, { recursive: true, force: true })
console.log('\n🧹 Example files cleaned up')
console.log('\n✅ Import resolution example complete!')
