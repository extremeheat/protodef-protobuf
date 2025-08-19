const http2 = require('http2')
const fs = require('fs')
const path = require('path')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('../../src/index.js')

// Load and transpile the .proto schema
const protoContent = fs.readFileSync(path.join(__dirname, 'service.proto'), 'utf8')
const generatedSchema = pp.transpile([protoContent])

// Create protocol with gRPC-style message framing
const protocol = {
  ...generatedSchema,
  // Use varint length instead of u32be for now
  grpc_request: ['protobuf_message', {
    lengthType: 'varint',
    type: 'greeting_HelloRequest'
  }],
  grpc_response: ['protobuf_message', {
    lengthType: 'varint',
    type: 'greeting_HelloReply'
  }]
}

console.log('📋 Generated schema types:', Object.keys(generatedSchema))
console.log('📋 Full protocol types:', Object.keys(protocol))

// Set up ProtoDef compiler
const compiler = new ProtoDefCompiler()
pp.addTypesToCompiler(compiler)
compiler.addTypesToCompile(protocol)
const proto = compiler.compileProtoDefSync()

class SimpleGrpcServer {
  constructor (port = 50051) {
    this.port = port

    // Create HTTP/2 server
    this.server = http2.createServer()
    this.server.on('stream', this.handleStream.bind(this))
  }

  async handleStream (stream, headers) {
    const path = headers[':path']
    const method = headers[':method']
    const contentType = headers['content-type']

    console.log(`📨 Incoming request: ${method} ${path}`)
    console.log(`   Content-Type: ${contentType}`)

    if (method !== 'POST' || !contentType?.includes('application/grpc')) {
      stream.respond({ ':status': 400 })
      stream.end('Bad Request: Not a gRPC request')
      return
    }

    // For this demo, we'll only handle the SayHello method
    if (path !== '/greeting.Greeter/SayHello') {
      stream.respond({
        ':status': 404,
        'grpc-status': '12', // UNIMPLEMENTED
        'grpc-message': 'Method not found'
      })
      stream.end()
      return
    }

    // Collect request data
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))

    stream.on('end', async () => {
      try {
        // For this demo, let's use a simpler approach
        // Skip the gRPC framing and just parse the protobuf data directly
        const requestBuffer = Buffer.concat(chunks)

        if (requestBuffer.length < 5) {
          throw new Error('Invalid gRPC frame')
        }

        // Skip gRPC framing for now and just use the protobuf_message wrapper
        // In a real implementation, we'd properly parse the gRPC wire format
        const data = requestBuffer.slice(5) // Skip gRPC frame header

        // Deserialize the protobuf message directly
        const request = proto.parsePacketBuffer('grpc_request', data)
        console.log('👋 SayHello called with:', request.data)

        // Create response
        const reply = {
          message: `Hello ${request.data.name}! You are ${request.data.age} years old.`,
          timestamp: BigInt(Date.now()),
          success: true
        }

        // Serialize response
        const responseBuffer = proto.createPacketBuffer('grpc_response', reply)

        // Create simple gRPC frame (compression flag + length + data)
        const grpcResponseBuffer = Buffer.alloc(5 + responseBuffer.length)
        grpcResponseBuffer.writeUInt8(0, 0) // Not compressed
        grpcResponseBuffer.writeUInt32BE(responseBuffer.length, 1) // Length
        responseBuffer.copy(grpcResponseBuffer, 5) // Data

        // Send gRPC response
        stream.respond({
          ':status': 200,
          'content-type': 'application/grpc',
          'grpc-status': '0'
        })

        stream.write(grpcResponseBuffer)
        stream.end()

        console.log(`✅ Response sent (${grpcResponseBuffer.length} bytes)`)
      } catch (error) {
        console.error('❌ Error handling request:', error.message)
        stream.respond({
          ':status': 500,
          'grpc-status': '13', // INTERNAL
          'grpc-message': error.message
        })
        stream.end()
      }
    })
  }

  listen () {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Simple gRPC server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  close () {
    return new Promise((resolve) => {
      this.server.close(resolve)
    })
  }
}

// Example usage
async function startServer () {
  const server = new SimpleGrpcServer(50051)
  await server.listen()

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...')
    await server.close()
    process.exit(0)
  })
}

if (require.main === module) {
  startServer().catch(console.error)
}

module.exports = { SimpleGrpcServer }
