#!/usr/bin/env node

// Pre-build script for deployment
const fs = require('fs');
const path = require('path');

// Create .env.production if it doesn't exist
const envPath = path.join(__dirname, '../.env.production');
const envExamplePath = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('Creating .env.production from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env.production created');
}

// Check if all required environment variables are set
const requiredEnvVars = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL'];
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const missingVars = requiredEnvVars.filter(varName => {
  return !envContent.includes(`${varName}=`);
});

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:', missingVars.join(', '));
  console.log('Please set these in your deployment platform settings');
} else {
  console.log('✅ All required environment variables are set');
}

console.log('🚀 Build configuration complete!');
