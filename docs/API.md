# API Reference

This document provides a detailed API for the **protodef-protobuf** library, with a focus on practical, real-world examples.

---

## Top-Level API (`protodef-protobuf`)

These are the main helper functions you will use in your project.

---

### `transpile(schemas)`

Parses and transpiles an array of `.proto` schema strings into a single protodef JSON schema.

- **schemas** `<Array<String>>`: An array of strings, where each string is the content of a `.proto` file.
- **Returns** `<Object>`: The protodef-compatible JSON schema.

#### How to Use It

This is the primary function for converting your schemas. It automatically handles parsing and merging multiple files, which is essential for using extensions.

```js
const pp = require('protodef-protobuf');

const baseSchema = `
  syntax = "proto2";
  package my.game;
  message Player { extensions 100 to 199; required int32 id = 1; }
`;
const extSchema = `
  syntax = "proto2";
  package my.game;
  extend Player { optional string username = 100; }
`;

// Pass an array of schema strings
const generatedSchema = pp.transpile([baseSchema, extSchema]);

console.log(generatedSchema);
/*
Output:
{
  my_game_Player: [
    'protobuf_container',
    [
      { name: 'id', type: 'varint', tag: 1, ... },
      { name: 'username', type: 'string', tag: 100, ... }
    ]
  ]
}
*/
```

---

### `addTypesToCompiler(compiler)`

A helper function that adds all the custom Protobuf types (`protobuf_container`, `protobuf_message`) to a `ProtoDefCompiler` instance.

- **compiler** `<Object>`: An instance of `ProtoDefCompiler`.

#### How to Use It

Call this once during your setup to teach the compiler how to handle the Protobuf types.

```js
const { ProtoDefCompiler } = require('protodef').Compiler;
const pp = require('protodef-protobuf');

const compiler = new ProtoDefCompiler();
pp.addTypesToCompiler(compiler); // Adds the necessary runtime logic

// ... now you can add your generated schemas
```

---

## Custom Protodef Types

These are the custom parametrizable types that provide the runtime logic. You will use `protobuf_message` in your own protocol definitions.

---

### `protobuf_message`

A container that frames a Protobuf message, usually with a length prefix. This is essential for embedding Protobuf messages in a stream or alongside other data.

**Schema:** `['protobuf_message', { options }]`

#### Options

- **type** `<String>` (Required): The name of the `protobuf_container` to encapsulate.
- **lengthType** `<String>` (Optional): A protodef type (e.g., `'varint'`, `'u16'`) for a length prefix that is read from/written to the stream.
- **length** `<String>` (Optional): The path to a variable in the context that contains the length of the message.

> You must provide either `lengthType` or `length`.

#### How to Use It

**Example 1: Simple Length Prefix (`lengthType`)**

This is the most common use case for framing a single message.

```js
// Your protodef schema
const protocol = {
  packet: ['protobuf_message', {
    lengthType: 'varint',
    type: 'my_package_MyMessage'
  }]
};

// Serializes to: [varint length of MyMessage][...bytes of MyMessage...]
```

**Example 2: Length from Another Field (`length`)**

This is for complex protocols where a header defines the payload length.

```js
// Your protodef schema
const protocol = {
  packet: ['container', [
    { name: 'header', type: 'packet_header' },
    {
      name: 'payload',
      type: ['protobuf_message', {
        length: 'header.payloadLength', // Use the value from the header
        type: 'my_package_MyMessage'
      }]
    }
  ]],

  packet_header: ['container', [
    { name: 'packetId', type: 'u8' },
    { name: 'payloadLength', type: 'u16' }
  ]]
};

// Serializes to: [1 byte packetId][2 bytes payloadLength][...payloadLength bytes of MyMessage...]
```

---

### `protobuf_container`

The core type that reads and writes the fields of a Protobuf message. The transpiler generates this for you, so you will **not** use it directly in your schemas.

---

## Usage Examples
* [Basic Example](../examples/basic.js)