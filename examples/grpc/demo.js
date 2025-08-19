const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting Simple gRPC Demo\n')

// Start server
console.log('📡 Starting server...')
const server = spawn('node', [path.join(__dirname, 'server.js')], {
  stdio: ['ignore', 'pipe', 'pipe']
})

server.stdout.on('data', (data) => {
  process.stdout.write(`[SERVER] ${data}`)
})

server.stderr.on('data', (data) => {
  process.stderr.write(`[SERVER] ${data}`)
})

// Wait for server to start, then run client
setTimeout(() => {
  console.log('\n📞 Starting client...\n')

  const client = spawn('node', [path.join(__dirname, 'client.js')], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  client.stdout.on('data', (data) => {
    process.stdout.write(`[CLIENT] ${data}`)
  })

  client.stderr.on('data', (data) => {
    process.stderr.write(`[CLIENT] ${data}`)
  })

  client.on('close', () => {
    console.log('\n✨ Demo complete! Shutting down server...\n')
    server.kill('SIGINT')

    setTimeout(() => {
      console.log('👋 Demo finished!')
      process.exit(0)
    }, 1000)
  })
}, 2000)

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Cleaning up...')
  server.kill('SIGINT')
  process.exit(0)
})
