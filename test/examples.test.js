/* eslint-env mocha */
/**
 * examples.test.js
 * Tests all examples to ensure they run without errors and produce expected outputs
 */

const { execSync } = require('child_process')
const path = require('path')
const assert = require('assert')

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples')

/**
 * Helper function to run an example and capture its output
 */
function runExample (examplePath, description) {
  try {
    console.log(`  Running: ${path.basename(examplePath)}`)
    const output = execSync(`node "${examplePath}"`, {
      cwd: path.dirname(examplePath),
      encoding: 'utf8',
      stdio: 'pipe'
    })
    return { success: true, output, error: null }
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    }
  }
}

describe('Examples Integration Tests', () => {
  describe('Core Examples', () => {
    it('should run basic-compiler.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'basic-compiler.js'))
      assert(result.success, `basic-compiler.js failed: ${result.error}`)
      assert(result.output.includes('Success!'), 'Should contain success message')
      assert(result.output.includes('encoded and decoded'), 'Should mention encoding/decoding')
    })

    it('should run basic-interpreter.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'basic-interpreter.js'))
      assert(result.success, `basic-interpreter.js failed: ${result.error}`)
      assert(result.output.includes('✅'), 'Should contain success indicator')
      assert(result.output.includes('interpreter'), 'Should mention interpreter mode')
    })

    it('should run message.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'message.js'))
      assert(result.success, `message.js failed: ${result.error}`)
      assert(result.output.includes('✓ Success!'), 'Should contain success indicator')
      assert(result.output.includes('Advanced Proto3'), 'Should handle advanced features')
    })

    it('should run message-bytes.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'message-bytes.js'))
      assert(result.success, `message-bytes.js failed: ${result.error}`)
      assert(result.output.includes('✅'), 'Should contain success indicator')
      assert(result.output.includes('bytes'), 'Should handle bytes fields')
    })

    it('should run extensions.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'extensions.js'))
      assert(result.success, `extensions.js failed: ${result.error}`)
      assert(result.output.includes('✓ Success!'), 'Should contain success indicator')
      assert(result.output.includes('extensions work'), 'Should handle extensions')
    })

    it('should run multiple-messages.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'multiple-messages.js'))
      assert(result.success, `multiple-messages.js failed: ${result.error}`)
      assert(result.output.includes('✓ Success!'), 'Should contain success indicator')
      assert(result.output.includes('complete protocol'), 'Should demonstrate protocol usage')
    })
  })

  describe('Import Examples', () => {
    it('should run google-imports.js successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'google-imports.js'))
      assert(result.success, `google-imports.js failed: ${result.error}`)
      assert(result.output.includes('✅'), 'Should contain success indicator')
      assert(result.output.includes('Google types'), 'Should handle Google types')
      assert(result.output.includes('automatically'), 'Should show automatic handling')
    })

    it('should run fs-imports example successfully', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'fs-imports', 'example.js'))
      assert(result.success, `fs-imports/example.js failed: ${result.error}`)
      assert(result.output.includes('✅'), 'Should contain success indicator')
      assert(result.output.includes('File-based'), 'Should demonstrate file-based imports')
    })
  })

  describe('Example Outputs Validation', () => {
    it('should validate google-imports demonstrates automatic handling', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'google-imports.js'))
      assert(result.success, 'google-imports.js should run successfully')

      // Verify it shows automatic Google type handling
      assert(result.output.includes('automatically'), 'Should mention automatic handling')
      assert(result.output.includes('google_protobuf_Timestamp'), 'Should generate Google timestamp type')
      assert(result.output.includes('google_protobuf_Empty'), 'Should generate Google empty type')
      assert(result.output.includes('works out of the box'), 'Should emphasize simplicity')
    })

    it('should validate fs-imports shows file-based approach', () => {
      const result = runExample(path.join(EXAMPLES_DIR, 'fs-imports', 'example.js'))
      assert(result.success, 'fs-imports/example.js should run successfully')

      // Verify it demonstrates file-based imports
      assert(result.output.includes('transpileFromFiles'), 'Should use transpileFromFiles')
      assert(result.output.includes('Generated'), 'Should show generated types count')
      assert(result.output.includes('manual approach'), 'Should mention manual approach')
    })

    it('should validate basic examples show both compiler and interpreter', () => {
      const compilerResult = runExample(path.join(EXAMPLES_DIR, 'basic-compiler.js'))
      const interpreterResult = runExample(path.join(EXAMPLES_DIR, 'basic-interpreter.js'))

      assert(compilerResult.success, 'basic-compiler.js should run successfully')
      assert(interpreterResult.success, 'basic-interpreter.js should run successfully')

      // Both should process data successfully
      assert(compilerResult.output.includes('Success!'), 'Compiler should show success')
      assert(interpreterResult.output.includes('✅') || interpreterResult.output.includes('Complete!'), 'Interpreter should show success')

      // Should show mode-specific information
      assert(compilerResult.output.includes('compiler') || compilerResult.output.includes('encoded'), 'Should show compiler operations')
      assert(interpreterResult.output.includes('interpreter') || interpreterResult.output.includes('Interpreter'), 'Should mention interpreter mode')
    })
  })

  describe('Error Handling Examples', () => {
    it('should validate examples handle errors gracefully', () => {
      // Most examples should complete without throwing unhandled errors
      const examples = [
        'basic-compiler.js',
        'basic-interpreter.js',
        'google-imports.js',
        'message.js',
        'message-bytes.js',
        'extensions.js',
        'multiple-messages.js'
      ]

      examples.forEach(exampleName => {
        const result = runExample(path.join(EXAMPLES_DIR, exampleName))
        assert(result.success, `${exampleName} should not throw unhandled errors: ${result.error}`)
      })
    })
  })

  describe('Performance Sanity Check', () => {
    it('should complete all examples within reasonable time', () => {
      const start = Date.now()

      // Run a few key examples
      const keyExamples = [
        'basic-compiler.js',
        'google-imports.js',
        'message.js'
      ]

      keyExamples.forEach(exampleName => {
        const result = runExample(path.join(EXAMPLES_DIR, exampleName))
        assert(result.success, `${exampleName} should complete successfully`)
      })

      const elapsed = Date.now() - start
      assert(elapsed < 10000, `Examples should complete within 10 seconds, took ${elapsed}ms`)
    })
  })
})
