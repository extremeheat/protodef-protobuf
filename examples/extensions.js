const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

console.log('=== Proto2 Extensions Example ===\n')

// Define a base schema with extension ranges
const basePlayerSchema = `
  syntax = "proto2";
  package game;

  message Player {
    extensions 100 to 199;
    required int32 id = 1;
    optional string name = 2;
  }
`

// Define extension schema that extends the base message
const playerExtensionSchema = `
  syntax = "proto2";
  package game;

  extend Player {
    optional int32 level = 100;
    optional string guild = 101;
    repeated string achievements = 102;
  }
`

// Transpile multiple schemas - they will be merged automatically
const generatedSchema = pp.transpile([basePlayerSchema, playerExtensionSchema])

console.log('Generated schema keys:', Object.keys(generatedSchema))

const protocol = {
  ...generatedSchema,
  player_update: ['protobuf_message', {
    lengthType: 'varint',
    type: 'game_Player'
  }]
}

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// Test data that includes both base fields and extension fields
const playerData = {
  id: 42,
  name: 'ExamplePlayer',
  level: 15,
  guild: 'TestGuild',
  achievements: ['first_login', 'level_10', 'guild_member']
}

console.log('Original player data:', playerData)

// Encode and decode
const encoded = proto.createPacketBuffer('player_update', playerData)
console.log('Encoded buffer size:', encoded.length, 'bytes')

const decoded = proto.parsePacketBuffer('player_update', encoded)
console.log('Decoded player data:', decoded.data)

// Verify the round-trip
assert.deepStrictEqual(decoded.data, playerData)

console.log('\n✓ Success! Proto2 extensions work correctly.')
console.log('✓ Base message fields and extension fields are handled seamlessly.')
