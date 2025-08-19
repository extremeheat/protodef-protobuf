# gRPC with protodef-protobuf

Surprised that `protodef-protobuf` can handle gRPC? Here's the secret: **gRPC is just HTTP/2 + Protocol Buffers + some conventions!**

This example demonstrates how to create a gRPC-compatible implementation using:
- Node.js `http2` module for transport  
- `protodef-protobuf` for Protocol Buffer message handling
- Simple HTTP/2 conventions for gRPC compatibility

## The gRPC "Magic" Demystified

gRPC might seem complex, but it's really just:

```
gRPC = HTTP/2 transport + Protocol Buffer messages + Standard conventions
```

**Breaking it down:**
- **HTTP/2**: Handles networking, multiplexing, and streaming
- **Protocol Buffers**: Handles efficient binary message serialization
- **Conventions**: Standard headers, framing format, and status codes

Since `protodef-protobuf` already handles Protocol Buffers perfectly, and Node.js has built-in HTTP/2 support, implementing gRPC becomes surprisingly straightforward!

## gRPC Wire Format Explained

Every gRPC message follows this simple format:

### 1. HTTP/2 Headers
```
:method: POST
:path: /package.Service/Method  
content-type: application/grpc
```

### 2. Message Frame
```
[1 byte: compression flag (0=uncompressed)]
[4 bytes: message length (big-endian)]
[N bytes: protobuf message data]
```

### 3. Response Headers
```
:status: 200
content-type: application/grpc
grpc-status: 0 (0=OK, others=error codes)
```

That's it! The complex part (Protocol Buffer serialization) is handled by `protodef-protobuf`.

## Files in This Example

- **`service.proto`** - Protocol Buffer schema with gRPC service definition
- **`server.js`** - Simple gRPC-compatible server implementation
- **`client.js`** - Simple gRPC-compatible client implementation  
- **`demo.js`** - Complete demo that runs both client and server

## Running the Example

### Option 1: Complete Demo
```bash
cd examples/grpc
node demo.js
```

### Option 2: Manual (Two Terminals)

**Terminal 1 - Start Server:**
```bash
cd examples/grpc
node server.js
```

**Terminal 2 - Run Client:**
```bash  
cd examples/grpc
node client.js
```

## What This Example Demonstrates

✅ **Protocol Buffer message serialization/deserialization** from `.proto` schemas  
✅ **HTTP/2 transport** with proper gRPC headers and status codes  
✅ **gRPC wire format** (5-byte frame + protobuf message data)  
✅ **Service method routing** based on HTTP/2 path  
✅ **Error handling** with gRPC status codes  
✅ **Real gRPC compatibility** - messages are wire-compatible with standard gRPC

## What's Simplified (For Learning)

This example focuses on core concepts, so we simplified:

❌ **Full gRPC metadata and custom headers**  
❌ **Authentication and authorization middleware**  
❌ **Streaming RPCs** (client/server/bidirectional streaming)  
❌ **Message compression** (frame supports it, not implemented here)  
❌ **Advanced retry logic and deadline handling**  

These features could absolutely be added - the foundation is all here!

## Key Takeaway

The "magic" of gRPC is mostly in the tooling and conventions. The actual wire protocol is quite simple:

1. **`protodef-protobuf` handles the hard part** - efficient Protocol Buffer message serialization
2. **Node.js `http2` handles transport** - networking, streams, multiplexing  
3. **Simple conventions** - standard headers, framing, status codes

This makes it very feasible to build production gRPC services using `protodef-protobuf` as your Protocol Buffer foundation!
