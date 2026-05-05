const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema.js');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/escuela_futbol';

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

module.exports = { client, db };
