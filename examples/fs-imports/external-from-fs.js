const pp = require('protodef-protobuf');

console.log('\n=== File-based approach ===');

const fs = require('fs');
const path = require('path');

const baseDir = __dirname

// Write the schemas to files
fs.writeFileSync(path.join(baseDir, 'common.proto'), commonSchema);
fs.writeFileSync(path.join(baseDir, 'user.proto'), userSchema);

try {
  const schema = pp.transpileFromFiles(['user.proto', 'common.proto'], {
    baseDir: baseDir,
    resolveImports: false  // We're providing all files manually
  });

  console.log('✅ File-based approach works:');
  console.log(`   Generated ${Object.keys(schema).length} types`);

  fs.rmSync(baseDir, { recursive: true, force: true });

} catch (error) {
  console.log('❌ Error:', error.message);
  fs.rmSync(baseDir, { recursive: true, force: true });
}

console.log('\n💡 Key Points:');
console.log('• For external imports, the manual approach is most reliable');
console.log('• Load all schemas yourself and pass them to transpile()');
console.log('• Use { allowImports: true } to allow import statements');
console.log('• You have full control over which schemas are included');
