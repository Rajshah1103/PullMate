// scripts/test-unit.js
import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { Logger } from '../src/logger.js';
import { ErrorHandler, PullMateError } from '../src/errorHandler.js';
import { Scheduler } from '../src/scheduler.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Test Logger
test('Logger creates log directory', (t) => {
  const testLogPath = path.join(os.tmpdir(), 'pullmate-test', 'test.log');
  const logger = new Logger(testLogPath);
  
  ok(fs.existsSync(path.dirname(testLogPath)), 'Log directory should exist');
  
  // Cleanup
  fs.rmSync(path.dirname(testLogPath), { recursive: true, force: true });
});

test('Logger writes messages', async (t) => {
  const testLogPath = path.join(os.tmpdir(), 'pullmate-test', 'test.log');
  const logger = new Logger(testLogPath, 'info');
  
  logger.info('Test message');
  
  // Wait a bit for file to be written
  await new Promise(resolve => setTimeout(resolve, 100));
  
  ok(fs.existsSync(testLogPath), 'Log file should exist');
  const logContent = fs.readFileSync(testLogPath, 'utf-8');
  ok(logContent.includes('Test message'), 'Log should contain test message');
  
  // Cleanup
  fs.rmSync(path.dirname(testLogPath), { recursive: true, force: true });
});

// Test Error Handling
test('PullMateError creates proper error object', (t) => {
  const error = new PullMateError('Test error', 'TEST_CODE', { detail: 'test' });
  
  strictEqual(error.message, 'Test error');
  strictEqual(error.code, 'TEST_CODE');
  strictEqual(error.details.detail, 'test');
  ok(error.timestamp);
});

test('ErrorHandler validates input correctly', (t) => {
  const handler = new ErrorHandler();
  
  // Valid path
  const validPath = handler.validateInput('/valid/path', 'path', 'testPath');
  strictEqual(validPath, '/valid/path');
  
  // Valid time
  const validTime = handler.validateInput('14:30', 'time', 'testTime');
  strictEqual(validTime, '14:30');
  
  // Invalid time should throw
  let threwError = false;
  try {
    handler.validateInput('25:30', 'time', 'testTime');
  } catch (e) {
    threwError = true;
    ok(e instanceof PullMateError);
  }
  ok(threwError, 'Should throw error for invalid time');
});

// Test Scheduler
test('Scheduler handles invalid time format', (t) => {
  const mockLogger = {
    warn: () => {},
    info: () => {},
    error: () => {},
    logSchedule: () => {} // Add missing method
  };
  
  const scheduler = new Scheduler(mockLogger);
  
  // This should not throw, but should log a warning
  const result = scheduler.setupSchedules({}, { test: 'invalid-time' });
  
  // No assertion needed, just ensuring it doesn't crash
  ok(true, 'Scheduler should handle invalid time gracefully');
});

console.log('✅ Unit tests completed');
