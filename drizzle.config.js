const { defineConfig } = require("drizzle-kit");
require('dotenv').config();

module.exports = defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:root@localhost:5432/escuela_futbol',
  },
});
