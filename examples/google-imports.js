const pp = require('protodef-protobuf');

console.log('=== Google Imports Example ===\n');

// A simple schema that uses common Google types, which work without external imports!
const userSchema = `
syntax = "proto3";
package user;

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

message User {
  string name = 1;
  string email = 2;
  google.protobuf.Timestamp created_at = 3;
  google.protobuf.Timestamp last_login = 4;
}

message DeleteUserResponse {
  google.protobuf.Empty result = 1;
}
`;

console.log('📝 Schema using Google types:');
console.log(userSchema);

// The magic: Google imports just work automatically!
console.log('=== Using transpile() - Google types are handled automatically! ===');

try {
  // No special handling needed - Google types are resolved automatically
  const schema = pp.transpile([userSchema]);

  console.log('✅ Generated types:');
  Object.keys(schema).forEach(type => console.log(`  ${type}`));

  console.log('\n✅ Success! Google types were automatically included');

} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n💡 Key Points:');
console.log('• Google well-known types are handled automatically by transpile()');
console.log('• No need for transpileFromFiles() or special options');
console.log('• Just import and use - it works out of the box!');
console.log('• transpileFromFiles() is only needed for external .proto files');
