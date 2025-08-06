# protodef-protobuf
[![NPM version](https://img.shields.io/npm/v/protodef-protobuf.svg)](http://npmjs.com/package/protodef-protobuf)
[![Build Status](https://github.com/extremeheat/protodef-protobuf/actions/workflows/ci.yml/badge.svg)](https://github.com/extremeheat/protodef-protobuf/actions/workflows/)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/extremeheat/protodef-protobuf)

A powerful transpiler and runtime for using Google Protocol Buffers (`.proto` files) with the [node-protodef](https://github.com/ProtoDef-io/node-protodef) compiler.

This library lets you define your protocol schemas in the industry-standard `.proto` format and seamlessly use them within the high-performance node-protodef ecosystem—perfect for custom network protocols, file parsers, and more.

## Features

- **Proto2 & Proto3 Support:** Transpiles schemas from both major versions of Protocol Buffers.
- **Full Feature Set:** Handles nested messages, enums, maps, packed repeated fields, and extensions.
- **High Performance:** Generates optimized JavaScript functions using protodef's AOT (Ahead-Of-Time) compiler.
- **Flexible Framing:** Includes a `protobuf_message` container for easily length-prefixing your Protobuf messages, making them embeddable in any protocol.
- **AST-based:** Works with the Abstract Syntax Tree from the `protocol-buffers-schema` package, allowing for powerful pre-processing and composition.

## Installation

```sh
npm install protodef-protobuf protocol-buffers-schema protodef
```

## Usage

The library consists of two main parts: a **transpiler** to convert your `.proto` schema into a protodef-compatible format, and a **custom datatype compiler** that teaches protodef how to read and write the Protobuf wire format.

### 1. Transpile Your Schema

First, parse your `.proto` file(s) and pass the resulting AST to the transpiler:

```js
const schemaParser = require('protocol-buffers-schema');
const { transpileProtobufAST } = require('protodef-protobuf/transpiler');
const fs = require('fs');

const protoFileContent = fs.readFileSync('my_protocol.proto', 'utf-8');
const ast = schemaParser.parse(protoFileContent);
const generatedSchema = transpileProtobufAST(ast);
```

### 2. Define Your Protocol

Create your main protocol definition. Typically, you'll wrap your Protobuf message in the `protobuf_message` container to handle framing:

```js
const mainProtocol = {
  // Define a top-level 'packet' type
  packet: ['protobuf_message', {
    lengthType: 'varint',           // The packet is prefixed with a varint length
    type: 'my_package_MyMessage'    // The payload is our Protobuf message
  }]
};
```

### 3. Compile and Use

Combine the generated schema and your main protocol, and pass them to the ProtoDefCompiler:

```js
const { ProtoDefCompiler } = require('protodef');
const assert = require('assert');

// Combine all schemas
const fullSchema = { ...generatedSchema, ...mainProtocol };

// Add a definition for the 'string' type used by protobuf
fullSchema.string = ['pstring', { countType: 'varint' }];

// Create and configure the compiler
const compiler = new ProtoDefCompiler();
compiler.addTypes(require('protodef-protobuf/compiler')); // Add our custom types
compiler.addTypesToCompile(fullSchema);

// Compile the protocol
const proto = compiler.compileProtoDefSync();

// --- You're ready to go! ---

const packetData = {
  
};

// Serialize
const buffer = proto.createPacketBuffer('packet', packetData);
// Deserialize
const result = proto.parsePacketBuffer('packet', buffer);

assert.deepStrictEqual(packetData, result.data);
console.log('Success!');
```

## API

For a detailed breakdown of the transpiler functions and custom protodef types, see [API.md](./API.md).

## Limitations

- **oneof Validation:** The library correctly parses the wire format for `oneof` fields. However, it does not enforce the "only one can be set" constraint on the resulting JavaScript object. This is treated as user-level validation.
