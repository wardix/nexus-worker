import type { JsMsg } from 'nats';
import { z } from 'zod';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';

const PayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
});

type Payload = z.infer<typeof PayloadSchema>;

export class SendWelcomeEmailJob extends BaseJob<Payload> {
  readonly subject = 'notification.email.welcome';

  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  protected async handle(payload: Payload, _msg: JsMsg): Promise<void> {
    logger.info(`Mengirim email ke ${payload.email} (User: ${payload.name})...`);

    // Simulasi proses async (misal memanggil API SendGrid / SMTP)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info(`Email berhasil terkirim ke ${payload.email}`);
  }
}
