const http2 = require('http2')
const fs = require('fs')
const path = require('path')
const { ProtoDefCompiler } = require('protodef').Compiler
const pp = require('protodef-protobuf')

// Load and transpile the .proto schema
const protoContent = fs.readFileSync(path.join(__dirname, 'service.proto'), 'utf8')
const generatedSchema = pp.transpile([protoContent])

// Create protocol with gRPC framing using standard container
const protocol = {
  ...generatedSchema,
  // Simplified gRPC frame using manual length handling
  grpc_request: ['container', [
    { name: 'compressed', type: 'u8' },
    { name: 'length', type: 'u32' },
    { name: 'data', type: ['buffer', { count: 'length' }] }
  ]],
  grpc_response: ['container', [
    { name: 'compressed', type: 'u8' },
    { name: 'length', type: 'u32' },
    { name: 'data', type: ['buffer', { count: 'length' }] }
  ]]
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
        const requestBuffer = Buffer.concat(chunks)

        if (requestBuffer.length < 5) {
          throw new Error('Invalid gRPC frame')
        }

        // Parse gRPC frame using ProtoDef container
        const grpcRequest = proto.parsePacketBuffer('grpc_request', requestBuffer)
        console.log(`📦 Received gRPC frame: compressed=${grpcRequest.data.compressed}, length=${grpcRequest.data.length}`)

        // Parse the inner protobuf message
        const innerMessage = proto.parsePacketBuffer('greeting_HelloRequest', grpcRequest.data.data)
        console.log('👋 SayHello called with:', innerMessage.data)

        // Create response
        const reply = {
          message: `Hello ${innerMessage.data.name}! You are ${innerMessage.data.age} years old.`,
          timestamp: BigInt(Date.now()),
          success: true
        }

        // Serialize the response message
        const replyBuffer = proto.createPacketBuffer('greeting_HelloReply', reply)

        // Create gRPC response frame
        const grpcResponse = {
          compressed: 0,
          length: replyBuffer.length,
          data: replyBuffer
        }

        const responseBuffer = proto.createPacketBuffer('grpc_response', grpcResponse)

        // Send gRPC response
        stream.respond({
          ':status': 200,
          'content-type': 'application/grpc',
          'grpc-status': '0'
        })

        stream.write(responseBuffer)
        stream.end()

        console.log(`✅ Response sent (${responseBuffer.length} bytes)`)
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
