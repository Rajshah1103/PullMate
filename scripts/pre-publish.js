#!/usr/bin/env node
/**
 * Pre-publish checks to ensure package quality
 */

import { execSync } from 'child_process';
import fs from 'fs';

const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'src/cli.js',
  'bin/index.js'
];

console.log('🔍 Running pre-publish checks...\n');

// Check required files exist
console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}
console.log('✅ All required files present\n');

// Run tests
console.log('🧪 Running tests...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ All tests passed\n');
} catch (error) {
  console.error('❌ Tests failed');
  process.exit(1);
}

// Check for uncommitted changes (only if in git repo)
console.log('📝 Checking for uncommitted changes...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.error('❌ Uncommitted changes detected:');
    console.error(status);
    console.error('Please commit all changes before publishing.');
    process.exit(1);
  }
} catch (error) {
  console.warn('⚠️ Could not check git status (not in a git repo?)');
}
console.log('✅ No uncommitted changes\n');

// Validate package.json
console.log('📦 Validating package.json...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'author', 'license'];
for (const field of requiredFields) {
  if (!pkg[field]) {
    console.error(`❌ Missing required package.json field: ${field}`);
    process.exit(1);
  }
}
console.log('✅ package.json is valid\n');

console.log('🎉 All pre-publish checks passed! Ready to publish.');
