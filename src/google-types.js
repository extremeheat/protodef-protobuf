/**
 * Google Protocol Buffer Well-Known Types
 *
 * These are the most commonly used Google protobuf types.
 * They are provided here as a convenience, but users can also:
 * - Provide their own versions
 * - Download them from Google's official protobuf repository
 * - Use them from a separate package
 *
 * Source: https://github.com/protocolbuffers/protobuf/tree/main/src/google/protobuf
 *
 * Note: These definitions may become outdated. For the most current versions,
 * consider downloading directly from Google's repository.
 */

const GOOGLE_WELL_KNOWN_TYPES = {
  'google/protobuf/timestamp.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // A Timestamp represents a point in time independent of any time zone or local
    // calendar, encoded as a count of seconds and fractions of seconds at
    // nanosecond resolution.
    message Timestamp {
      // Represents seconds of UTC time since Unix epoch
      // 1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
      // 9999-12-31T23:59:59Z inclusive.
      int64 seconds = 1;

      // Non-negative fractions of a second at nanosecond resolution. Negative
      // second values with fractions must still have non-negative nanos values
      // that count forward in time. Must be from 0 to 999,999,999 inclusive.
      int32 nanos = 2;
    }
  `,

  'google/protobuf/duration.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // A Duration represents a signed, fixed-length span of time represented
    // as a count of seconds and fractions of seconds at nanosecond
    // resolution.
    message Duration {
      // Signed seconds of the span of time. Must be from -315,576,000,000
      // to +315,576,000,000 inclusive.
      int64 seconds = 1;

      // Signed fractions of a second at nanosecond resolution of the span
      // of time. Durations less than one second are represented with a 0
      // seconds field and a positive or negative nanos field.
      int32 nanos = 2;
    }
  `,

  'google/protobuf/any.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // Any contains an arbitrary serialized protocol buffer message along with a
    // URL that describes the type of the serialized message.
    message Any {
      // A URL/resource name that uniquely identifies the type of the serialized
      // protocol buffer message.
      string type_url = 1;

      // Must be a valid serialized protocol buffer of the above specified type.
      bytes value = 2;
    }
  `,

  'google/protobuf/empty.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // A generic empty message that you can re-use to avoid defining duplicated
    // empty messages in your APIs.
    message Empty {
    }
  `,

  'google/protobuf/wrappers.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // Wrapper message for double.
    message DoubleValue {
      double value = 1;
    }

    // Wrapper message for float.
    message FloatValue {
      float value = 1;
    }

    // Wrapper message for int64.
    message Int64Value {
      int64 value = 1;
    }

    // Wrapper message for uint64.
    message UInt64Value {
      uint64 value = 1;
    }

    // Wrapper message for int32.
    message Int32Value {
      int32 value = 1;
    }

    // Wrapper message for uint32.
    message UInt32Value {
      uint32 value = 1;
    }

    // Wrapper message for bool.
    message BoolValue {
      bool value = 1;
    }

    // Wrapper message for string.
    message StringValue {
      string value = 1;
    }

    // Wrapper message for bytes.
    message BytesValue {
      bytes value = 1;
    }
  `,

  'google/protobuf/struct.proto': `
    syntax = "proto3";
    package google.protobuf;
    
    // Struct represents a structured data value, consisting of fields
    // which map to dynamically typed values.
    message Struct {
      // Unordered map of dynamically typed values.
      map<string, Value> fields = 1;
    }

    // Value represents a dynamically typed value which can be either
    // null, a number, a string, a boolean, a recursive struct value, or a
    // list of values.
    message Value {
      // The kind of value.
      oneof kind {
        // Represents a null value.
        NullValue null_value = 1;
        // Represents a double value.
        double number_value = 2;
        // Represents a string value.
        string string_value = 3;
        // Represents a boolean value.
        bool bool_value = 4;
        // Represents a structured value.
        Struct struct_value = 5;
        // Represents a repeated Value.
        ListValue list_value = 6;
      }
    }

    // NullValue is a singleton enumeration to represent the null value for the
    // Value type union.
    enum NullValue {
      // Null value.
      NULL_VALUE = 0;
    }

    // ListValue is a wrapper around a repeated field of values.
    message ListValue {
      // Repeated field of dynamically typed values.
      repeated Value values = 1;
    }
  `,

  'google/protobuf/field_mask.proto': `
    syntax = "proto3";
    package google.protobuf;

    // FieldMask represents a set of symbolic field paths, for example:
    //
    //     paths: "f.a"
    //     paths: "f.b.d"
    //
    // Here f represents a field in some root message, a and b
    // fields in the message found in f, and d a field found in the
    // message in f.b.
    message FieldMask {
      // The set of field mask paths.
      repeated string paths = 1;
    }
  `
}

module.exports = {
  googleTypes: GOOGLE_WELL_KNOWN_TYPES
}
