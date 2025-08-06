# API Reference

This document provides a detailed API reference for **protodef-protobuf**, with practical examples and common usage patterns.

## Table of Contents

- [Main API Functions](#main-api-functions)
  - [`transpile()`](#transpileschemas)
  - [`addTypesToCompiler()`](#addtypestocompilercompiler)
  - [`addTypesToInterpreter()`](#addtypestointerpreterpredicate)
- [Custom ProtoDef Types](#custom-protodef-types)
  - [`protobuf_message`](#protobuf_message)
  - [`protobuf_container`](#protobuf_container)
- [Usage Patterns](#usage-patterns)
  - [Compiler vs Interpreter](#compiler-vs-interpreter)
- [Examples](#examples)

---

## Main API Functions

These are the primary functions you'll use to integrate Protocol Buffers with ProtoDef.

---

### `transpile(schemas)`

Converts Protocol Buffer `.proto` schemas into ProtoDef-compatible JSON format.

**Parameters:**
- `schemas` **Array<String>** - Array of `.proto` file contents as strings

**Returns:**
- **Object** - ProtoDef JSON schema containing all message types

**Example:**
```js
const pp = require('protodef-protobuf')

const schema = `
  syntax = "proto3";
  package example;
  message User {
    string name = 1;
    int32 age = 2;
  }
`

const result = pp.transpile([schema])
console.log(result)
// Output: { example_User: ['protobuf_container', [...]] }
```

**With Multiple Schemas (Extensions):**
```js
const base = `
  syntax = "proto2";
  package game;
  message Player {
    extensions 100 to 199;
    required int32 id = 1;
  }
`

const extension = `
  syntax = "proto2";
  package game;
  extend Player {
    optional string username = 100;
  }
`

const merged = pp.transpile([base, extension])
// Automatically merges the extension into the Player message
```

### `addTypesToCompiler(compiler)`

Registers all custom Protobuf types with a ProtoDef compiler instance.

**Parameters:**
- `compiler` **ProtoDefCompiler** - Instance of ProtoDef compiler

**Returns:**
- **void**

**Example:**
```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)  // Adds protobuf_message, protobuf_container, etc.

// Now you can compile schemas that use Protobuf types
compiler.addTypesToCompile({
  my_packet: ['protobuf_message', { /* ... */ }]
})
```

### `addTypesToInterpreter(protodef)`

Registers all custom Protobuf types with a ProtoDef interpreter instance. The interpreter provides runtime flexibility and is ideal for dynamic schemas or when targeting other languages.

**Parameters:**
- `protodef` **ProtoDef** - Instance of ProtoDef interpreter

**Returns:**
- **void**

**Example:**
```js
const { ProtoDef } = require('protodef')
const pp = require('protodef-protobuf')

const interpreter = new ProtoDef()
pp.addTypesToInterpreter(interpreter)  // Adds protobuf types

// Add your generated schema
const schema = pp.transpile([protoSchema])
interpreter.addTypes(schema)

// Use the interpreter
const data = { name: 'Alice', age: 30 }
const encoded = interpreter.createPacketBuffer('User', data)
const decoded = interpreter.parsePacketBuffer('User', encoded)
```

**Benefits of Interpreter Mode:**
- **Runtime Flexibility**: No compilation step, modify schemas dynamically
- **Better Debugging**: Direct execution makes it easier to inspect and debug
- **Language Portability**: Simpler to port to other languages (like Rust)
- **Reduced Memory**: No generated JavaScript code to store

**When to Use:**
- Prototyping and development
- Dynamic schema handling
- Cross-language implementations
- Educational purposes

---

## Custom ProtoDef Types

These types are automatically registered when you call `addTypesToCompiler()`. You'll primarily use `protobuf_message` in your schemas.

---

### `protobuf_message`

A container type that frames Protobuf messages, typically with a length prefix. Essential for embedding Protobuf messages in streams or mixed protocols.

**Schema Format:**
```js
['protobuf_message', {
  type: 'message_type_name',    // Required: Protobuf message type
  lengthType: 'varint',         // Optional: Length prefix type  
  length: 'path.to.length'      // Optional: Context path to length
}]
```

**Parameters:**
- `type` **String** *(required)* - Name of the protobuf_container type to wrap
- `lengthType` **String** *(optional)* - ProtoDef type for length prefix (`'varint'`, `'u16'`, etc.)
- `length` **String** *(optional)* - Context path to length value

> **Note:** You must specify either `lengthType` OR `length`, not both.

#### Common Patterns

**Pattern 1: Simple Length Prefix**
```js
const protocol = {
  ...generatedSchema,
  chat_packet: ['protobuf_message', {
    lengthType: 'varint',           // Varint length prefix
    type: 'chat_ChatMessage'        // Your message type
  }]
}

// Wire format: [varint:length][protobuf data...]
```

**Pattern 2: Pre-determined Length**
```js
const protocol = {
  packet: ['container', [
    { name: 'header', type: ['container', [
      { name: 'type', type: 'u8' },
      { name: 'payloadSize', type: 'u16' }
    ]]},
    { name: 'payload', type: ['protobuf_message', {
      length: 'header.payloadSize',   // Use header field
      type: 'game_PlayerUpdate'
    }]}
  ]]
}

// Wire format: [u8:type][u16:size][protobuf data...]
```

**Pattern 3: Multiple Message Types**
```js
const protocol = {
  ...generatedSchema,
  
  login_packet: ['protobuf_message', {
    lengthType: 'varint',
    type: 'auth_LoginRequest'
  }],
  
  chat_packet: ['protobuf_message', {
    lengthType: 'varint', 
    type: 'chat_ChatMessage'
  }],
  
  game_packet: ['protobuf_message', {
    lengthType: 'varint',
    type: 'game_PlayerUpdate'  
  }]
}
```

### `protobuf_container`

The core type that handles the actual Protobuf wire format encoding/decoding. This is generated automatically by the transpiler - **you don't use this directly**.

**Generated by:** The `transpile()` function creates these for each message in your schema.

**Internal Usage:**
```js
// This is what the transpiler generates:
{
  example_User: ['protobuf_container', [
    { name: 'name', type: 'string', tag: 1 },
    { name: 'age', type: 'varint', tag: 2 }
  ]]
}
```

---

## Usage Patterns

### Compiler vs Interpreter

**protodef-protobuf** supports both ProtoDef's compiler and interpreter modes. Choose based on your needs:

#### Compiler Mode (Default)
- **Performance**: Pre-compiled JavaScript functions, fastest execution
- **Production**: Ideal for production applications with fixed schemas
- **Memory**: Uses more memory due to generated code
- **Flexibility**: Requires recompilation when schemas change

```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(schema)
const proto = compiler.compileProtoDefSync()
```

#### Interpreter Mode (New)
- **Flexibility**: Dynamic schema handling, no compilation step
- **Development**: Better for prototyping and debugging
- **Portability**: Easier to port to other languages
- **Memory**: Lower memory usage, direct execution

```js
const { ProtoDef } = require('protodef')
const pp = require('protodef-protobuf')

const interpreter = new ProtoDef()
pp.addTypesToInterpreter(interpreter)
interpreter.addTypes(schema)
```

### Complete Setup Example

```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// 1. Define your schemas
const schemas = [`
  syntax = "proto3";
  package app;
  message User {
    string name = 1;
    int32 age = 2;
  }
`]

// 2. Transpile
const generatedSchema = pp.transpile(schemas)

// 3. Create protocol
const protocol = {
  ...generatedSchema,
  user_packet: ['protobuf_message', {
    lengthType: 'varint',
    type: 'app_User'
  }]
}

// 4. Setup compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

// 5. Use it!
const userData = { name: 'Alice', age: 30 }
const encoded = proto.createPacketBuffer('user_packet', userData)
const decoded = proto.parsePacketBuffer('user_packet', encoded)
```

### Interpreter Setup Example

```js
const { ProtoDef } = require('protodef')
const pp = require('protodef-protobuf')

// 1. Define your schemas
const schemas = [`
  syntax = "proto3";
  package app;
  message User {
    string name = 1;
    int32 age = 2;
  }
`]

// 2. Transpile
const generatedSchema = pp.transpile(schemas)

// 3. Setup interpreter
const interpreter = new ProtoDef()
pp.addTypesToInterpreter(interpreter)
interpreter.addTypes(generatedSchema)

// 4. Use it directly!
const userData = { name: 'Alice', age: 30 }
const encoded = interpreter.createPacketBuffer('app_User', userData)
const decoded = interpreter.parsePacketBuffer('app_User', encoded)

// 5. Or use low-level API
const buffer = Buffer.alloc(1000)
const bytesWritten = interpreter.write(userData, buffer, 0, 'app_User', {})
const result = interpreter.read(buffer, 0, 'app_User', {})
```

### Working with File-based Schemas

```js
const fs = require('fs')
const pp = require('protodef-protobuf')

// Load multiple .proto files
const baseSchema = fs.readFileSync('schemas/base.proto', 'utf8')
const userSchema = fs.readFileSync('schemas/user.proto', 'utf8') 
const gameSchema = fs.readFileSync('schemas/game.proto', 'utf8')

// Transpile all together
const generatedSchema = pp.transpile([baseSchema, userSchema, gameSchema])
```

### Advanced Protocol Design

```js
const protocol = {
  ...generatedSchema,
  
  // Packet with header + protobuf payload
  game_packet: ['container', [
    { name: 'header', type: ['container', [
      { name: 'packetType', type: 'u8' },
      { name: 'payloadSize', type: 'u16' },
      { name: 'timestamp', type: 'u32' }
    ]]},
    { name: 'payload', type: ['protobuf_message', {
      length: 'header.payloadSize',
      type: 'game_PlayerAction'  
    }]}
  ]],
  
  // Simple framed message
  chat_packet: ['protobuf_message', {
    lengthType: 'varint',
    type: 'chat_Message'
  }]
}
```

---

## Examples

- **[Basic Usage](../examples/basic.js)** - Simple Proto3 message encoding/decoding
- **[Interpreter Mode](../examples/interpreter.js)** - Using ProtoDef interpreter for runtime flexibility
- **[Proto2 Extensions](../examples/extensions.js)** - Working with Proto2 extensions  
- **[Advanced Features](../examples/advanced.js)** - Nested messages, enums, maps
- **[Multiple Messages](../examples/multiple-messages.js)** - Complete protocol with multiple message types