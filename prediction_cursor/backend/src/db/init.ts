/**
 * Database initialization script
 * Run with: npm run db:init
 */

import { initializeDatabase } from './database';

console.log('Initializing database...');
initializeDatabase();
console.log('Database initialization complete!');
console.log('\nDefault credentials:');
console.log('  Email: demo@example.com');
console.log('  Password: demo123');
console.log('  Starting balance: $1,000');
