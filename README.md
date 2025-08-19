# protodef-protobuf
[![NPM version](https://img.shields.io/npm/v/protodef-protobuf.svg)](http://npmjs.com/package/protodef-protobuf)
[![Build Status](https://github.com/extremeheat/protodef-protobuf/actions/workflows/ci.yml/badge.svg)](https://github.com/extremeheat/protodef-protobuf/actions/workflows/)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/extremeheat/protodef-protobuf)

A transpiler and runtime for using Google Protocol Buffers (`.proto` files) with ProtoDef in Node.js via [node-protodef](https://github.com/ProtoDef-io/node-protodef) (supporting both interpreter and compiler).

This allows you to read/write Protocol Buffer-encoded messages in your ProtoDef defined protocols without needing external parsing.

## Features

- **Proto2 & Proto3 Support:** Supports both major versions of Protocol Buffers.
- **Full Feature Set:** Handles nested messages, enums, maps, packed repeated fields, and extensions.
- **High Performance:** Generates optimized JavaScript functions using protodef's AOT (Ahead-Of-Time) compiler.
- **Runtime Flexibility:** Supports ProtoDef's interpreter mode on top of compiler for dynamic schemas.
- **Flexible Framing:** Includes a `protobuf_message` container for easily length-prefixing your Protobuf messages, making them embeddable in any protocol.
- **Import Support:** Handles `.proto` file imports including Google well-known types with automatic error detection.

## Installation

```sh
npm install protodef-protobuf protodef
```

## Quick Start

```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// 1. Define your .proto schema
const schema = `
  syntax = "proto3";
  package chat;
  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

// 2. Transpile and create protocol
const generatedSchema = pp.transpile([schema])
const protocol = {
  ...generatedSchema,
  packet_hello: ['protobuf_message', {
    lengthType: 'varint',
    type: 'chat_ChatMessage'
  }]
}

// 3. Compile and use
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// 4. Encode/decode messages
const data = { user_id: 'user123', content: 'Hello, world!' }
const encoded = proto.createPacketBuffer('packet_hello', data)
const decoded = proto.parsePacketBuffer('packet_hello', encoded)
```

## How It Works

This library consists of two main components:

1. **Transpiler**: Converts your `.proto` schemas into ProtoDef-compatible JSON
2. **Runtime Types**: Custom ProtoDef types that handle Protobuf wire format encoding/decoding

The library supports both **compiler mode** (for performance) and **interpreter mode** (for flexibility). See the [API documentation](docs/API.md) for detailed comparison.

### Detailed Usage

#### 1. Transpile Your Schema

**Simple schemas (no imports)**
```js
const pp = require('protodef-protobuf')

const schema = `
  syntax = "proto3";
  package chat;
  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

const generatedSchema = pp.transpile([schema])
```

**Schemas with Google well-known types**
```js
// Google types are handled automatically!
const schemaWithGoogle = `
  syntax = "proto3";
  import "google/protobuf/timestamp.proto";
  message User {
    string name = 1;
    google.protobuf.Timestamp created_at = 2;
  }
`

// No special handling needed - Google imports work automatically
const schema = pp.transpile([schemaWithGoogle])  // ✅ Just works!
```

**Schemas with external imports**
```js
const fs = require('fs')

// Option A: Manual approach (most reliable)
const baseSchema = fs.readFileSync('common.proto', 'utf8')
const userSchema = fs.readFileSync('user.proto', 'utf8') 
const schema = pp.transpile([baseSchema, userSchema], { 
  allowImports: true  // Allow import statements
})

// Option B: File-based resolution
const schema = pp.transpileFromFiles(['user.proto'], {
  baseDir: './protos'
})
```

**Error handling**
```js
try {
  // This throws a helpful error for unresolved external imports
  const schema = pp.transpile([schemaWithExternalImports])
} catch (error) {
  // Provides clear guidance on how to resolve imports
  console.log(error.message)
}
```

```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// Single schema
const schema = `
  syntax = "proto3";
  package chat;
  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

// Multiple schemas (useful for extensions)
const baseSchema = `
  syntax = "proto2";
  package game;
  message Player {
    extensions 100 to 199;
    required int32 id = 1;
  }
`
const extensionSchema = `
  syntax = "proto2";  
  package game;
  extend Player {
    optional string name = 100;
  }
`

// Transpile - automatically merges multiple schemas
const generatedSchema = pp.transpile([schema])
// or: pp.transpile([baseSchema, extensionSchema])
```

#### 2. Define Your Protocol and Compile

Create your protocol definition and compile it:

```js
const protocol = {
  ...generatedSchema, // Include the generated schema
  
  // Wrap Protobuf messages with length framing
  packet_hello: ['protobuf_message', {
    lengthType: 'varint',        // Length prefix type
    type: 'chat_ChatMessage'     // Your Protobuf message type
  }]
}

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)    // Add Protobuf runtime types
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// Now you can encode/decode messages!
const data = { user_id: 'user123', content: 'Hello, world!' }
const encoded = proto.createPacketBuffer('packet_hello', data)
const decoded = proto.parsePacketBuffer('packet_hello', encoded)
```

## Examples

**Getting Started**
- **[Basic Compiler](examples/basic-compiler.js)** - Simple Proto3 message with compiler
- **[Basic Interpreter](examples/basic-interpreter.js)** - Same example using interpreter mode

**Core Features** 
- **[Extensions](examples/extensions.js)** - Working with Proto2 extensions
- **[Multiple Messages](examples/multiple-messages.js)** - Complete protocol example
- **[Message Bytes](examples/message-bytes.js)** - Handling binary data

**Import Handling**
- **[Google Imports](examples/google-imports.js)** - Using Google well-known types (automatic)
- **[File System Imports](examples/fs-imports/)** - Importing custom .proto files from disk

**Advanced**
- **[gRPC Example](examples/grpc/)** - Using with gRPC-style schemas

## API Reference

See **[API.md](docs/API.md)** for detailed documentation of all functions and types.

## Supported Features

| Feature | Proto2 | Proto3 | Notes |
|---------|--------|--------|-------|
| Basic Types | ✅ | ✅ | `int32`, `string`, `bool`, etc. |
| Messages | ✅ | ✅ | Nested messages supported |
| Enums | ✅ | ✅ | Named values |
| Repeated Fields | ✅ | ✅ | Including packed encoding |
| Maps | ✅ | ✅ | `map<key, value>` syntax |
| Extensions | ✅ | N/A | Not available in Proto3 spec |
| Oneof | ✅ | ✅ | Wire format only* |

*Oneof constraint validation is not enforced - treat as user validation.

## Limitations

- **oneof Validation:** The library correctly parses the wire format for `oneof` fields. However, it does not enforce the "only one can be set" constraint on the resulting JavaScript object. This is treated as user-level validation.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.