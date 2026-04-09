import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NATS_URL: z.string().url().default('nats://localhost:4222'),
  NATS_STREAM_NAME: z.string().default('NEXUS_STREAM'),
  NATS_CONSUMER_NAME: z.string().default('nexus_worker_group'),
  NATS_USER: z.string().optional(),
  NATS_PASS: z.string().optional(),
  NATS_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi Environment Variable Tidak Valid:', parsed.error.format());
  process.exit(1);
}

export const ENV = parsed.data;
