import type { JsMsg } from 'nats';
import { z } from 'zod';
import { ENV } from '../../../config/env';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';

const PayloadSchema = z.object({
  to: z.string().optional(),
  target_date: z.string().optional(),
  excluded_employee_ids: z.string().optional(),
  department_id: z.coerce.number().int().optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

interface EmployeeSummary {
  employee_id: string;
  name: string;
  total_tickets: number;
  tickets: number[];
}

export class SendEmployeeTicketSummaryJob extends BaseJob<Payload> {
  readonly subject = 'notification.reminder.employee-ticket-summary';

  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  protected async handle(payload: Payload, _msg: JsMsg): Promise<void> {
    logger.info('Mulai mengambil data summary tiket karyawan dari NIS Gateway...');

    try {
      // Default target_date ke kemarin (H-1)
      const targetDate = payload.target_date ?? this.getYesterdayDate();

      const departmentId = payload.department_id ?? ENV.DEFAULT_DEPARTMENT_ID;

      const excludedEmployeeIds =
        payload.excluded_employee_ids ?? ENV.DEFAULT_EXCLUDED_EMPLOYEE_IDS;

      const url = new URL(ENV.NIS_EMPLOYEE_SUMMARY_URL);
      url.searchParams.set('target_date', targetDate);
      url.searchParams.set('department_id', departmentId.toString());
      if (excludedEmployeeIds) {
        url.searchParams.set('excluded_employee_ids', excludedEmployeeIds);
      }

      logger.info({ targetDate, departmentId, excludedEmployeeIds }, 'Parameter request');

      const response = await fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${ENV.NIS_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil summary tiket: ${response.statusText}`);
      }

      const responseData = await response.json();
      const employees: EmployeeSummary[] = responseData.results || [];

      if (employees.length === 0) {
        logger.info('Tidak ada data summary tiket karyawan.');
        return;
      }

      const messageLines = employees.map((emp, index) => {
        let alertIcon = '';
        if (emp.total_tickets >= 10) {
          alertIcon = '🚨';
        } else if (emp.total_tickets >= 5) {
          alertIcon = '⚠️';
        }

        const ticketList = emp.tickets.join(', ');
        return `${index + 1}. ${alertIcon}${emp.name} (${emp.total_tickets} tiket)\n   ${ticketList}`;
      });

      const totalTickets = employees.reduce((sum, emp) => sum + emp.total_tickets, 0);

      const fullMessage =
        `📊 Summary Tiket Karyawan - ${targetDate}\n` +
        `Total: ${totalTickets} tiket, ${employees.length} karyawan\n\n` +
        `${messageLines.join('\n')}`;

      logger.info(`Mengirim summary ${employees.length} karyawan ke WhatsApp...`);

      const waResponse = await fetch(ENV.WA_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.WA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to ?? ENV.WA_TICKET_SUMMARY_TARGET_NUMBER,
          body: 'text',
          text: fullMessage,
        }),
      });

      if (!waResponse.ok) {
        const errorText = await waResponse.text();
        throw new Error(`Gagal mengirim WhatsApp: ${waResponse.statusText} - ${errorText}`);
      }

      const result = await waResponse.json();
      logger.info({ result }, 'Berhasil mengirim summary tiket karyawan via WhatsApp.');
    } catch (error) {
      logger.error(error, 'Terjadi kesalahan saat memproses summary tiket karyawan');
      throw error;
    }
  }

  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}
