import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NATS_URL: z.string().url().default('nats://localhost:4222'),
  NATS_STREAM_NAME: z.string().default('NEXUS_STREAM'),
  NATS_CONSUMER_NAME: z.string().default('nexus_worker_group'),
  NATS_USER: z.string().optional(),
  NATS_PASS: z.string().optional(),
  NATS_TOKEN: z.string().optional(),

  // Zabbix Configuration
  IFORTE_ZABBIX_URL: z.string().url().default('https://zabbix.iforte.id/api_jsonrpc.php'),
  IFORTE_ZABBIX_USERNAME: z.string().min(1),
  IFORTE_ZABBIX_PASSWORD: z.string().min(1),
  IFORTE_ZABBIX_GRAPH_NAME_FILTER: z.string().default('NUSANET-'),
  IFORTE_GRAPH_ID_PREFIX: z.string().default('iforte-'),

  // Worker Configuration
  MAX_RETRIES: z.coerce.number().int().min(1).default(3),

  // NIS Sync Configuration
  NIS_GRAPH_SYNC_URL: z.string().url(),
  NIS_TOKEN: z.string().min(1),
  NIS_IFORTE_TICKETS_URL: z.string().url(),

  // Notification Job (FBStar Reminder)
  PROM_TICKETS_URL: z.string().url().default('https://metrics.example.com/operator-tickets'),
  WA_API_URL: z.string().url().default('https://api.whatsapp.example.com/v2/messages'),
  WA_API_TOKEN: z.string().min(1),
  WA_FBSTAR_TARGET_NUMBER: z.string().min(1),
  WA_IFORTE_TARGET_NUMBER: z.string().min(1),

  // Notification Job (Employee Ticket Summary)
  NIS_EMPLOYEE_SUMMARY_URL: z.string().url(),
  WA_TICKET_SUMMARY_TARGET_NUMBER: z.string().min(1),
  DEFAULT_DEPARTMENT_ID: z.coerce.number().int().default(34),
  DEFAULT_EXCLUDED_EMPLOYEE_IDS: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Konfigurasi Environment Variable Tidak Valid:', parsed.error.format());
  process.exit(1);
}

export const ENV = parsed.data;
