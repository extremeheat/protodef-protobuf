# protodef-protobuf
[![NPM version](https://img.shields.io/npm/v/protodef-protobuf.svg)](http://npmjs.com/package/protodef-protobuf)
[![Build Status](https://github.com/extremeheat/protodef-protobuf/actions/workflows/ci.yml/badge.svg)](https://github.com/extremeheat/protodef-protobuf/actions/workflows/)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/extremeheat/protodef-protobuf)

A transpiler and runtime for using Google Protocol Buffers (`.proto` files) with ProtoDef in Node.js via [node-protodef](https://github.com/ProtoDef-io/node-protodef) compiler.

This allows you to read/write Protocol Buffer-encoded messages in your ProtoDef defined protocols without needing external parsing.

## Features

- **Proto2 & Proto3 Support:** Supports both major versions of Protocol Buffers.
- **Full Feature Set:** Handles nested messages, enums, maps, packed repeated fields, and extensions.
- **High Performance:** Generates optimized JavaScript functions using protodef's AOT (Ahead-Of-Time) compiler.
- **Flexible Framing:** Includes a `protobuf_message` container for easily length-prefixing your Protobuf messages, making them embeddable in any protocol.

## Installation

```sh
npm install protodef-protobuf protodef
```

## Usage

This library consists of 1. a transpiler to convert your `.proto` schema into ProtoDef JSON and 2. custom datatypes for node-protodef to work with the generated JSON schema.

### 1. Transpile Your Schema

First, parse your `.proto` file(s) and pass the resulting AST to the transpiler:

```js
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf');

// Either import from a file like schema.proto or define inline:
const schema = `
  syntax = "proto3";
  package chat;

  message ChatMessage {
    string user_id = 1;
    string content = 2;
  }
`

// If using extensions, you can push to the array with [base, extension1, ...] which'll be merged
const generatedSchema = pp.transpile([schema])
```

### 2. Define Your Protocol and Compile

Create your main protocol definition. Typically, you'll wrap your Protobuf message in the `protobuf_message` container to handle framing (as Protocol Buffer messages do not have a length prefix by themselves):

```js
const assert = require('assert')

const protocol = {
  ...generatedSchema, // Include the generated schema
  packet_hello: ['protobuf_message', {
    lengthType: 'varint',           // The message is prefixed with a varint length
    type: 'chat_ChatMessage'        // The payload is our Protobuf message
  }]
}

// Create and configure the compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler) // Add our custom types
compiler.addTypesToCompile(protocol) // Add the generated schema
const proto = compiler.compileProtoDefSync()

const helloPacket = {
  user_id: 'user123',
  content: 'Hello, world!'
}

const encoded = proto.createPacketBuffer('packet_hello', helloPacket)
console.log('Encoded Buffer:', encoded)

const decoded = proto.parsePacketBuffer('packet_hello', encoded)
assert.deepStrictEqual(decoded.data, helloPacket)
```

## API

For a detailed breakdown of the transpiler functions and custom protodef types, see [API.md](./API.md).

## Limitations

- **oneof Validation:** The library correctly parses the wire format for `oneof` fields. However, it does not enforce the "only one can be set" constraint on the resulting JavaScript object. This is treated as user-level validation.
