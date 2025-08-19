const assert = require('assert');
const { ProtoDefCompiler } = require('protodef').Compiler;
const pp = require('protodef-protobuf');

console.log('=== External Schema Imports Example ===\n');

// First, let's create some schemas that import from each other
const commonSchema = `
syntax = "proto3";
package common;

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
}

message Contact {
  string email = 1;
  string phone = 2;
}
`;

const userSchema = `
syntax = "proto3";
package user;

import "common.proto";

message User {
  string id = 1;
  string name = 2;
  common.Address address = 3;
  common.Contact contact = 4;
}
`;

console.log('📁 We have two schemas:');
console.log('• common.proto - defines Address and Contact');
console.log('• user.proto - imports and uses common types\n');

// Method 1: Manual approach (most reliable)
console.log('=== Method 1: Manual approach ===');

try {
  const schema = pp.transpile([commonSchema, userSchema], { 
    allowImports: true 
  });

  console.log('✅ Generated types:');
  Object.keys(schema).forEach(type => console.log(`  ${type}`));

  console.log('✅ Manual approach works - all schemas combined successfully');

} catch (error) {
  console.log('❌ Error:', error.message);
}

// Method 2: File-based approach
console.log('\n=== Method 2: File-based approach ===');

const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'temp_external');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Write the schemas to files
fs.writeFileSync(path.join(tempDir, 'common.proto'), commonSchema);
fs.writeFileSync(path.join(tempDir, 'user.proto'), userSchema);

try {
  const schema = pp.transpileFromFiles(['user.proto', 'common.proto'], {
    baseDir: tempDir,
    resolveImports: false  // We're providing all files manually
  });

  console.log('✅ File-based approach works:');
  console.log(`   Generated ${Object.keys(schema).length} types`);

  fs.rmSync(tempDir, { recursive: true, force: true });

} catch (error) {
  console.log('❌ Error:', error.message);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\n💡 Key Points:');
console.log('• For external imports, the manual approach is most reliable');
console.log('• Load all schemas yourself and pass them to transpile()');
console.log('• Use { allowImports: true } to allow import statements');
console.log('• You have full control over which schemas are included');
