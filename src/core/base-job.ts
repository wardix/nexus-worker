import { JsMsg, StringCodec } from 'nats';
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
      jobLogger.error({ err: error }, 'Pekerjaan gagal');
      msg.nak(); 
    }
  }
}
