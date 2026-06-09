import type { JsMsg } from 'nats';
import { z } from 'zod';
import { ENV } from '../../../config/env';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';

const PayloadSchema = z.object({});

type Payload = z.infer<typeof PayloadSchema>;

interface IforteTicket {
  ticket_id: number;
  insert_time: string;
  ticket_status: string;
  customer_id: string;
  subscriber_id: number;
  subscription_status: string;
  subscriber_name: string;
  ticket_subject: string;
}

export class SendIforteTicketReminderJob extends BaseJob<Payload> {
  readonly subject = 'notification.reminder.iforte';

  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  protected async handle(_payload: Payload, _msg: JsMsg): Promise<void> {
    logger.info('Mulai mengambil data tiket iForte dari NIS Gateway...');

    try {
      const response = await fetch(ENV.NIS_IFORTE_TICKETS_URL, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${ENV.NIS_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil tiket iForte: ${response.statusText}`);
      }

      const responseData = await response.json();
      const tickets: IforteTicket[] = responseData.results || [];

      if (tickets.length === 0) {
        logger.info('Tidak ada data tiket iForte.');
        return;
      }

      const openTickets = tickets.filter((t) => t.ticket_status === 'Open');

      if (openTickets.length === 0) {
        logger.info('Tidak ada tiket iForte yang berstatus Open.');
        return;
      }

      // Sort tickets: AC first, then by age (oldest first)
      openTickets.sort((a, b) => {
        if (a.subscription_status === 'AC' && b.subscription_status !== 'AC') return -1;
        if (a.subscription_status !== 'AC' && b.subscription_status === 'AC') return 1;
        
        return new Date(a.insert_time).getTime() - new Date(b.insert_time).getTime();
      });

      const messageLines = openTickets.map((ticket) => {
        const insertDate = new Date(ticket.insert_time);
        const ageHours = Math.floor((Date.now() - insertDate.getTime()) / (1000 * 3600));

        let alertIcon = '';
        if (ageHours >= 24) {
          alertIcon = '🚨';
        } else if (ageHours >= 18) {
          alertIcon = '⚠️';
        }

        const acIcon = ticket.subscription_status === 'AC' ? '💎' : '';

        let durationText = `${ageHours} jam`;
        if (ageHours >= 48) {
          const days = Math.floor(ageHours / 24);
          durationText = `${days}+ hari`;
        }

        return `- ${alertIcon}${acIcon}${ticket.customer_id}:${ticket.subscriber_id} ${ticket.subscriber_name} ${ticket.ticket_subject} ${durationText}`;
      });

      const fullMessage = `Mohon dibantu tindak lanjut tiket berikut ini:\n\n${messageLines.join('\n')}`;

      logger.info(`Mengirim ${openTickets.length} reminder tiket iForte ke WhatsApp...`);

      const waResponse = await fetch(ENV.WA_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.WA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: ENV.WA_IFORTE_TARGET_NUMBER,
          body: 'text',
          text: fullMessage,
        }),
      });

      if (!waResponse.ok) {
        const errorText = await waResponse.text();
        throw new Error(`Gagal mengirim WhatsApp: ${waResponse.statusText} - ${errorText}`);
      }

      const result = await waResponse.json();
      logger.info({ result }, 'Berhasil mengirim reminder tiket iForte via WhatsApp.');
    } catch (error) {
      logger.error(error, 'Terjadi kesalahan saat memproses reminder iForte');
      throw error;
    }
  }
}
