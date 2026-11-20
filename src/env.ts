import { z } from "zod";

// Environment variables validated by Zod
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Optional: Better Auth trusted origins (comma-separated)
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional().default(""),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

export { env };