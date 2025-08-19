/**
 * TypeScript definitions for protodef-protobuf
 * 
 * A transpiler and runtime for using Google Protocol Buffers (.proto files) with ProtoDef.
 * 
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * A ProtoDef schema object containing message type definitions
 */
export interface ProtoDefSchema {
  [typeName: string]: any
}

/**
 * Options for the transpile() function
 */
export interface TranspileOptions {
  /**
   * If false (default), handle Google imports automatically but error on external imports.
   * If true, allow import statements without automatic resolution.
   * @default false
   */
  allowImports?: boolean
}

/**
 * Options for the transpileFromFiles() function
 */
export interface TranspileFromFilesOptions {
  /**
   * Base directory for resolving relative paths
   * @default process.cwd()
   */
  baseDir?: string

  /**
   * Additional directories to search for imports
   * @default []
   */
  includeDirs?: string[]

  /**
   * Whether to automatically resolve import statements
   * @default true
   */
  resolveImports?: boolean

  /**
   * Whether to include Google well-known types
   * @default true
   */
  includeGoogleTypes?: boolean
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Transpile Protocol Buffer schema strings into ProtoDef-compatible JSON format.
 * 
 * Google well-known types are automatically handled when imported.
 * External imports will throw an error unless allowImports is true.
 * 
 * @param schemas - Array of .proto file contents as strings
 * @param options - Transpilation options
 * @returns ProtoDef schema object with message type definitions
 * 
 * @example
 * ```typescript
 * const schema = `
 *   syntax = "proto3";
 *   package chat;
 *   message ChatMessage {
 *     string user_id = 1;
 *     string content = 2;
 *   }
 * `;
 * const result = transpile([schema]);
 * ```
 */
export function transpile(schemas: string[], options?: TranspileOptions): ProtoDefSchema

/**
 * Transpile .proto files from the filesystem with automatic import resolution.
 * 
 * @param filePaths - Array of .proto file paths to transpile
 * @param options - File loading and import resolution options
 * @returns ProtoDef schema object
 * 
 * @example
 * ```typescript
 * const schema = transpileFromFiles(['user.proto', 'common.proto'], {
 *   baseDir: './protos',
 *   resolveImports: true
 * });
 * ```
 */
export function transpileFromFiles(filePaths: string[], options?: TranspileFromFilesOptions): ProtoDefSchema

/**
 * Add all custom protobuf types to a ProtoDef compiler instance.
 * 
 * This includes protobuf_message, protobuf_container, and other custom types
 * needed for Protocol Buffer wire format support.
 * 
 * @param compiler - ProtoDef compiler instance
 * 
 * @example
 * ```typescript
 * import { ProtoDefCompiler } from 'protodef'
 * 
 * const compiler = new ProtoDefCompiler()
 * addTypesToCompiler(compiler)
 * ```
 */
export function addTypesToCompiler(compiler: any): void

/**
 * Add all custom protobuf types to a ProtoDef interpreter instance.
 * 
 * This includes protobuf_message, protobuf_container, and other custom types
 * needed for Protocol Buffer wire format support.
 * 
 * @param protodef - ProtoDef interpreter instance
 * 
 * @example
 * ```typescript
 * import { ProtoDef } from 'protodef'
 * 
 * const protodef = new ProtoDef()
 * addTypesToInterpreter(protodef)
 * ```
 */
export function addTypesToInterpreter(protodef: any): void

// ============================================================================
// Module Declaration
// ============================================================================

declare const protobufProtoDef: {
  transpile: typeof transpile
  transpileFromFiles: typeof transpileFromFiles
  addTypesToCompiler: typeof addTypesToCompiler
  addTypesToInterpreter: typeof addTypesToInterpreter
}

export = protobufProtoDef
export default protobufProtoDef
