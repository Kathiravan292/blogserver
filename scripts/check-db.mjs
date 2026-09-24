/**
 * Quick MongoDB connection check. Reads MONGO_URI from .env and reports pass/fail in
 * seconds, so a credential problem can be confirmed without watching the API retry.
 *
 *   npm run check:db
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import mongoose from 'mongoose';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(projectRoot, '.env');

let uri;

try {
  uri = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((line) => line.startsWith('MONGO_URI='))
    ?.slice('MONGO_URI='.length)
    .trim();
} catch {
  console.error(`FAIL  No .env found at ${envPath}. Copy .env.example to .env first.`);
  process.exit(1);
}

if (!uri) {
  console.error('FAIL  No MONGO_URI line in .env');
  process.exit(1);
}

const password = uri.match(/^mongodb\+srv:\/\/[^:]*:([^@]*)@/)?.[1] ?? '';

if (password === '<db_password>') {
  console.error('FAIL  .env still contains the literal placeholder <db_password>.');
  console.error('      Replace it with the real password for the database user.');
  process.exit(1);
}

// Masks only the password, leaving the username and host visible for diagnosis.
console.log('Connecting to', uri.replace(/(\/\/[^:]*:)[^@]*@/, '$1****@'));

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map((collection) => collection.name);

  console.log(`PASS  Connected. Database: ${mongoose.connection.name}`);
  console.log(`      Collections: ${names.length ? names.join(', ') : '(none yet)'}`);

  await mongoose.disconnect();
} catch (error) {
  console.error('FAIL ', error.message);

  if (/bad auth/i.test(error.message)) {
    console.error('      -> Wrong password, or an Atlas reset that has not propagated yet.');
  } else if (/ENOTFOUND|querySrv/i.test(error.message)) {
    console.error('      -> Host name looks wrong, or no DNS access to Atlas.');
  } else if (/timed out|ETIMEDOUT/i.test(error.message)) {
    console.error('      -> Add your current IP under Atlas > Network Access.');
  }

  process.exit(1);
}
