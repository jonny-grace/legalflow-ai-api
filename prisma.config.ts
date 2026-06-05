import 'dotenv/config';
import { defineConfig, env } from 'prisma/config'; // Import env helper

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'), // Use the Prisma 7 env string evaluator
  },
});
