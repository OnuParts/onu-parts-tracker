const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building ONU Parts Tracker for production...');

// Step 1: Install dependencies
console.log('📦 Installing server dependencies...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Failed to install server dependencies');
  process.exit(1);
}

// Step 2: Build frontend
console.log('🎨 Building frontend...');
try {
  execSync('cd client && npm install', { stdio: 'inherit', cwd: __dirname });
  execSync('cd client && npm run build', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Failed to build frontend');
  process.exit(1);
}

// Step 3: Copy built files to correct location
console.log('📁 Setting up production files...');
const clientDistPath = path.join(__dirname, 'client', 'dist');
const serverClientPath = path.join(__dirname, 'client');

if (fs.existsSync(clientDistPath)) {
  console.log('✅ Frontend build successful');
} else {
  console.error('❌ Frontend build files not found');
  process.exit(1);
}

console.log('🎉 Build completed successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Set up your PostgreSQL database');
console.log('2. Run the database-schema.sql file');
console.log('3. Configure environment variables (.env)');
console.log('4. Start with: node server.js');
console.log('');
console.log('See DEPLOYMENT.md for detailed instructions.');