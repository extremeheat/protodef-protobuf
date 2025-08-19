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

      // Serialize request using protobuf_message wrapper
      const requestBuffer = proto.createPacketBuffer('grpc_request', request)

      // Create simple gRPC frame (compression flag + length + data)
      const grpcFrame = Buffer.alloc(5 + requestBuffer.length)
      grpcFrame.writeUInt8(0, 0) // Not compressed
      grpcFrame.writeUInt32BE(requestBuffer.length, 1) // Length
      requestBuffer.copy(grpcFrame, 5) // Data

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

          // Parse gRPC frame and extract protobuf data
          const compressed = responseBuffer.readUInt8(0)
          const length = responseBuffer.readUInt32BE(1)
          const data = responseBuffer.slice(5, 5 + length)

          console.log(`📦 Received gRPC frame: compressed=${compressed}, length=${length}`)

          // Deserialize response using protobuf_message wrapper
          const response = proto.parsePacketBuffer('grpc_response', data)
          console.log('✅ Response:', response.data)

          resolve(response.data)
        } catch (error) {
          reject(error)
        }
      })

      stream.on('error', (error) => {
        reject(error)
      })

      // Send request
      stream.write(grpcFrame)
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
