import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load the environment variables from .env.local
dotenv.config({ path: '.env.local' });

export default defineConfig({
	schema: './db/schema.js', // Where Cursor put your schema
	out: './drizzle', // Where Drizzle keeps its history
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
