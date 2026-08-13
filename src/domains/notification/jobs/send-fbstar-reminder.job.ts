import type { JsMsg } from 'nats';
import { z } from 'zod';
import { ENV } from '../../../config/env';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';

const PayloadSchema = z.object({
  to: z.string().optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

export class SendFbstarReminderJob extends BaseJob<Payload> {
  readonly subject = 'notification.reminder.fbstar';

  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  protected async handle(payload: Payload, _msg: JsMsg): Promise<void> {
    logger.info('Mulai mengambil data tiket FBStar dari Prometheus...');

    try {
      const response = await fetch(ENV.PROM_TICKETS_URL);
      if (!response.ok) {
        throw new Error(`Gagal mengambil metrik: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split('\n');
      const tickets: Array<{
        ticket_number: string;
        circuit_id: string;
        category: string;
        age_hours: number;
        timestamp_unix: number;
      }> = [];

      const metricsRegex = /operator_ticket_created_timestamp_seconds\{(.*)\} (\d+)/;

      for (const line of lines) {
        const match = line.match(metricsRegex);
        if (match) {
          const [_, tags, timestamp] = match;
          const ticketData: Record<string, string> = {
            timestamp_unix: timestamp,
          };

          const tagPairs = tags.match(/(\w+)="([^"]*)"/g);
          if (tagPairs) {
            for (const pair of tagPairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                ticketData[key] = value.replace(/"/g, '');
              }
            }
          }

          if (
            ticketData.operator === 'fbstar' &&
            ticketData.ticket_number !== 'pending' &&
            ticketData.ticket_number !== undefined
          ) {
            const ts = Number.parseInt(ticketData.timestamp_unix, 10);
            const ageHours = Math.floor((Date.now() / 1000 - ts) / 3600);

            tickets.push({
              ticket_number: ticketData.ticket_number,
              circuit_id: ticketData.circuit_id || '-',
              category: ticketData.category || '-',
              age_hours: ageHours,
              timestamp_unix: ts,
            });
          }
        }
      }

      if (tickets.length === 0) {
        logger.info('Tidak ada tiket FBStar yang perlu di-follow up.');
        return;
      }

      // Sort by timestamp_unix
      tickets.sort((a, b) => a.timestamp_unix - b.timestamp_unix);

      const messageLines = tickets.map(
        ({ ticket_number, circuit_id, category, age_hours }, index) => {
          let alertIcon = '';
          if (age_hours >= 24) {
            alertIcon = '🚨';
          } else if (age_hours >= 18) {
            alertIcon = '⚠️';
          }

          let durationText = `${age_hours} jam`;
          if (age_hours >= 48) {
            const days = Math.floor(age_hours / 24);
            durationText = `${days}+ hari`;
          }

          const categoryText = category !== 'unknown' ? ` ${category}` : '';
          return `${index + 1}. ${alertIcon}${ticket_number} ${circuit_id}${categoryText} ${durationText}`;
        },
      );

      const fullMessage = `rekan fiberstar, mohon dibantu tindak lanjut tiket berikut ini:\n${messageLines.join('\n')}`;

      logger.info(`Mengirim ${tickets.length} reminder tiket ke WhatsApp...`);

      const waResponse = await fetch(ENV.WA_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.WA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to ?? ENV.WA_FBSTAR_TARGET_NUMBER,
          body: 'text',
          text: fullMessage,
        }),
      });

      if (!waResponse.ok) {
        const errorText = await waResponse.text();
        throw new Error(`Gagal mengirim WhatsApp: ${waResponse.statusText} - ${errorText}`);
      }

      const result = await waResponse.json();
      logger.info({ result }, 'Berhasil mengirim reminder tiket FBStar via WhatsApp.');
    } catch (error) {
      logger.error(error, 'Terjadi kesalahan saat memproses reminder FBStar');
      throw error;
    }
  }
}
