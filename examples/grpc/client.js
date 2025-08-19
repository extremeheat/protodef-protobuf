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

class SimpleGrpcClient {
  constructor (address = 'http://localhost:50051') {
    this.address = address
    this.client = http2.connect(address)

    this.client.on('error', (err) => {
      console.error('❌ Client connection error:', err.message)
    })
  }

  async call (serviceName, methodName, request) {
    return new Promise((resolve, reject) => {
      const path = `/${serviceName}/${methodName}`

      console.log(`📤 Calling ${path} with:`, request)

      // Serialize the protobuf request first
      const requestMessageBuffer = proto.createPacketBuffer('greeting_HelloRequest', request)

      // Create gRPC frame using container
      const grpcRequest = {
        compressed: 0,
        length: requestMessageBuffer.length,
        data: requestMessageBuffer
      }

      const requestBuffer = proto.createPacketBuffer('grpc_request', grpcRequest)

      // Create HTTP/2 stream
      const stream = this.client.request({
        ':method': 'POST',
        ':path': path,
        'content-type': 'application/grpc',
        te: 'trailers'
      })

      // Handle response
      const responseChunks = []

      stream.on('response', (headers) => {
        console.log('📨 Response headers:', headers)
      })

      stream.on('data', (chunk) => {
        responseChunks.push(chunk)
      })

      stream.on('end', () => {
        try {
          const responseBuffer = Buffer.concat(responseChunks)

          if (responseBuffer.length === 0) {
            reject(new Error('Empty response'))
            return
          }

          // Parse gRPC response using container
          const grpcResponse = proto.parsePacketBuffer('grpc_response', responseBuffer)
          console.log(`📦 Received gRPC frame: compressed=${grpcResponse.data.compressed}, length=${grpcResponse.data.length}`)

          // Parse the inner protobuf message
          const innerMessage = proto.parsePacketBuffer('greeting_HelloReply', grpcResponse.data.data)
          console.log('✅ Response:', innerMessage.data)

          resolve(innerMessage.data)
        } catch (error) {
          reject(error)
        }
      })

      stream.on('error', (error) => {
        reject(error)
      })

      // Send request
      stream.write(requestBuffer)
      stream.end()
    })
  }

  close () {
    this.client.close()
  }
}

// Example usage
async function runClient () {
  const client = new SimpleGrpcClient()

  try {
    // Call SayHello
    const request = {
      name: 'Alice',
      age: 25
    }

    const response = await client.call(
      'greeting.Greeter',
      'SayHello',
      request
    )

    console.log('\n🎉 Success! Server responded with:')
    console.log(`   Message: ${response.message}`)
    console.log(`   Timestamp: ${response.timestamp}`)
    console.log(`   Success: ${response.success}`)
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    client.close()
  }
}

if (require.main === module) {
  // Give server time to start
  setTimeout(runClient, 1000)
}

module.exports = { SimpleGrpcClient }
