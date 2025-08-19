const pp = require('protodef-protobuf')
const baseDir = __dirname

console.log('\n=== .transpileFromFiles ===')

const schema = pp.transpileFromFiles(['user.proto', 'common.proto'], {
  baseDir,
  resolveImports: false // We're providing all files manually
})

console.log('✅ File-based approach works:')
console.log(`   Generated ${Object.keys(schema).length} types`)

console.log('\n💡 Key Points:')
console.log('• For external imports, the manual approach is most reliable')
console.log('• Load all schemas yourself and pass them to transpile()')
console.log('• Use { allowImports: true } to allow import statements')
console.log('• You have full control over which schemas are included')
