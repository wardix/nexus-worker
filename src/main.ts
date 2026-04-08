import { connect, consumerOpts } from 'nats';
import { ENV } from './config/env';
import { logger } from './core/logger';
import { SendWelcomeEmailJob } from './domains/notification/jobs/send-welcome-email.job';

async function bootstrap() {
  logger.info(`Menghubungkan ke NATS di ${ENV.NATS_URL}...`);
  const nc = await connect({ servers: ENV.NATS_URL });
  const js = nc.jetstream();

  // Daftarkan semua job di sini
  const registeredJobs = [
    new SendWelcomeEmailJob(),
  ];

  const opts = consumerOpts();
  opts.durable(ENV.NATS_CONSUMER_NAME);
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo(ENV.NATS_CONSUMER_NAME);

  // Map untuk routing
  const jobMap = new Map(registeredJobs.map((job) => [job.subject, job]));

  const sub = await js.subscribe(`${ENV.NATS_STREAM_NAME}.>`, opts);
  logger.info(`🚀 Nexus Worker siap menerima pekerjaan...`);

  // Loop utama pemrosesan pesan
  (async () => {
    for await (const msg of sub) {
      const routingKey = msg.subject.replace(`${ENV.NATS_STREAM_NAME}.`, '');
      const job = jobMap.get(routingKey);

      if (job) {
        job.execute(msg);
      } else {
        logger.warn(`Job untuk subject '${routingKey}' tidak ditemukan. Mengabaikan pesan.`);
        msg.term();
      }
    }
  })();

  // Graceful Shutdown Handler
  const shutdown = async () => {
    logger.info('🛑 Menerima sinyal mati. Menutup koneksi dengan aman...');
    await sub.drain();
    await nc.close();
    logger.info('Koneksi tertutup. Selamat tinggal!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error(err, 'Gagal memulai aplikasi');
  process.exit(1);
});
