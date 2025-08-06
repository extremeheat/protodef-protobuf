const assert = require('assert')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

console.log('=== Advanced Proto3 Features Example ===\n')

// Advanced schema with nested messages, enums, maps, and repeated fields
const advancedSchema = `
  syntax = "proto3";
  package game;

  message GameState {
    enum Status {
      UNKNOWN = 0;
      WAITING = 1;
      IN_PROGRESS = 2;
      FINISHED = 3;
    }
    
    message Player {
      string id = 1;
      int32 score = 2;
      map<string, int32> stats = 3;
      repeated string inventory = 4;
    }
    
    message Settings {
      int32 max_players = 1;
      float time_limit = 2;
      bool friendly_fire = 3;
    }
    
    Status status = 1;
    repeated Player players = 2;
    map<string, string> metadata = 3;
    Settings game_settings = 4;
    repeated int32 recent_scores = 5 [packed=true];
  }
`

// Transpile the schema
const generatedSchema = pp.transpile([advancedSchema])

console.log('Generated types:', Object.keys(generatedSchema))

const protocol = {
  ...generatedSchema,
  game_state_update: ['protobuf_message', {
    lengthType: 'varint',
    type: 'game_GameState'
  }]
}

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// Create comprehensive test data
const gameStateData = {
  status: 'IN_PROGRESS',
  players: [
    {
      id: 'player1',
      score: 1250,
      stats: [
        { key: 'kills', value: 15 },
        { key: 'deaths', value: 3 },
        { key: 'assists', value: 8 }
      ],
      inventory: ['rifle', 'pistol', 'grenade', 'armor']
    },
    {
      id: 'player2', 
      score: 980,
      stats: [
        { key: 'kills', value: 12 },
        { key: 'deaths', value: 5 },
        { key: 'assists', value: 6 }
      ],
      inventory: ['sniper', 'pistol', 'smoke']
    }
  ],
  metadata: [
    { key: 'map', value: 'dust2' },
    { key: 'mode', value: 'competitive' },
    { key: 'server', value: 'EU-West-1' }
  ],
  game_settings: {
    max_players: 10,
    time_limit: 90.5,
    friendly_fire: false
  },
  recent_scores: [1250, 1180, 1050, 980, 890]
}

console.log('Original game state:')
console.log(JSON.stringify(gameStateData, null, 2))

// Encode and decode
const encoded = proto.createPacketBuffer('game_state_update', gameStateData)
console.log('\nEncoded buffer size:', encoded.length, 'bytes')

const decoded = proto.parsePacketBuffer('game_state_update', encoded)
console.log('\nDecoded successfully!')

// Verify the round-trip
assert.deepStrictEqual(decoded.data, gameStateData)

console.log('\n✓ Success! Advanced Proto3 features work correctly:')
console.log('  • Nested messages (Player, Settings)')
console.log('  • Enums (Status)')
console.log('  • Maps (stats, metadata)')  
console.log('  • Repeated fields (players, inventory, recent_scores)')
console.log('  • Packed repeated fields (recent_scores)')
console.log('  • Mixed data types (strings, ints, floats, booleans)')
