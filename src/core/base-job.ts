import { type JsMsg, StringCodec } from 'nats';
import { ENV } from '../config/env';
import { logger } from './logger';

const sc = StringCodec();

export abstract class BaseJob<PayloadType> {
  abstract readonly subject: string;

  protected abstract handle(payload: PayloadType, msg: JsMsg): Promise<void>;
  protected abstract validatePayload(data: unknown): PayloadType;

  public async execute(msg: JsMsg): Promise<void> {
    const traceId = msg.headers?.get('x-trace-id') || crypto.randomUUID();
    const jobLogger = logger.child({ job: this.subject, traceId });

    try {
      jobLogger.debug('Menerima pesan baru');

      // Jika NATS mengirim data kosong, tangani dengan aman
      const dataStr = msg.data.length > 0 ? sc.decode(msg.data) : '{}';
      const rawData = JSON.parse(dataStr);

      const payload = this.validatePayload(rawData);

      await this.handle(payload, msg);

      msg.ack();
      jobLogger.info('Pekerjaan selesai dengan sukses');
    } catch (error) {
      const currentAttempt = msg.info?.redeliveryCount || 1;
      const retryCount = currentAttempt - 1;

      jobLogger.error({ err: error, attempt: currentAttempt }, 'Pekerjaan gagal');

      if (retryCount >= ENV.MAX_RETRIES) {
        jobLogger.warn(
          `Batas maksimal retry (${ENV.MAX_RETRIES}) tercapai. Memberhentikan pesan ini.`,
        );
        msg.term();
      } else {
        const delayMs = Math.pow(2, currentAttempt) * 1000;
        jobLogger.info(`Akan mencoba ulang (retry ke-${retryCount + 1}) dalam ${delayMs}ms`);
        msg.nak(delayMs);
      }
    }
  }
}
