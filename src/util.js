const WIRE_TYPES = {
  varint: 0,
  zigzag32: 0,
  zigzag64: 0,
  varint64: 0,
  bool: 0,
  li64: 1,
  lu64: 1,
  lf64: 1,
  string: 2,
  buffer: 2,
  li32: 5,
  lu32: 5,
  lf32: 5
}

const PROTO_TO_PROTODEF_TYPE_MAP = {
  int32: 'varint',
  uint32: 'varint',
  int64: 'varint64',
  uint64: 'varint64',
  bool: 'bool',
  enum: 'varint',
  // ZigZag VarInt
  sint32: 'zigzag32',
  sint64: 'zigzag64',
  // 32-bit Little-Endian
  fixed32: 'lu32',
  sfixed32: 'li32',
  float: 'lf32',
  // 64-bit Little-Endian
  fixed64: 'lu64',
  sfixed64: 'li64',
  double: 'lf64',
  // Length-Delimited
  string: 'string',
  bytes: 'buffer'
}

module.exports = {
  WIRE_TYPES,
  PROTO_TO_PROTODEF_TYPE_MAP
}
