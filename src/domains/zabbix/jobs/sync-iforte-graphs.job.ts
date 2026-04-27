import type { JsMsg } from 'nats';
import { z } from 'zod';
import { ENV } from '../../../config/env';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';

const PayloadSchema = z.object({});
type Payload = z.infer<typeof PayloadSchema>;

interface SyncGraphData {
  graphid: string;
  subscriberId: string;
}

interface ZabbixGraphItem {
  name: string;
}

interface ZabbixGraph {
  graphid: string;
  name: string;
  items?: ZabbixGraphItem[];
}

interface ZabbixRPCResponse<T> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data: string;
  };
  id: number;
}

export class SyncIforteGraphsJob extends BaseJob<Payload> {
  readonly subject = 'zabbix.sync.iforte.graphs';
  private requestId = 1;

  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  protected async handle(_payload: Payload, _msg: JsMsg): Promise<void> {
    let token: string | undefined;

    try {
      logger.info('Starting iForte Zabbix graph synchronization...');

      // 1. Login to Zabbix
      token = await this.zabbixLogin();
      logger.info('Logged in to Zabbix successfully.');

      // 2. Fetch graphs
      const graphs = await this.zabbixGetGraphs(token);
      logger.info(`Found ${graphs.length} graph(s) in Zabbix.`);

      // 3. Prepare data to sync
      const syncData: SyncGraphData[] = graphs
        .map((graph) => {
          const firstItemName = graph.items?.[0]?.name ?? '';
          const match = firstItemName.match(/(\d+):(\d+)/);
          if (!match) return null;

          return {
            graphid: graph.graphid,
            subscriberId: match[2],
          };
        })
        .filter((item): item is SyncGraphData => item !== null);

      logger.info(`Extracted ${syncData.length} valid items for synchronization.`);

      if (syncData.length === 0) {
        logger.warn('No valid items found to sync. Skipping.');
        return;
      }

      // 4. Batching (limit 64 per submit)
      const BATCH_SIZE = 64;
      for (let i = 0; i < syncData.length; i += BATCH_SIZE) {
        const batch = syncData.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        logger.info(`Syncing batch ${batchNumber}...`);
        await this.syncToEndpoint(batch);
      }

      logger.info('All batches synchronized successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to sync Zabbix graphs: ${errorMessage}`);
      throw error;
    }
  }

  private async zabbixRequest<T>(method: string, params: unknown, sessionid?: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json-rpc',
    };
    if (sessionid) {
      headers.Authorization = `Bearer ${sessionid}`;
    }

    const response = await fetch(ENV.IFORTE_ZABBIX_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId++,
      }),
    });

    if (!response.ok) {
      throw new Error(`Zabbix HTTP error: ${response.status} ${response.statusText}`);
    }

    const data: ZabbixRPCResponse<T> = await response.json();

    if (data.error) {
      throw new Error(
        `Zabbix API Error [${data.error.code}]: ${data.error.message}. ${data.error.data}`,
      );
    }

    if (data.result === undefined) {
      throw new Error('Zabbix API Error: Result is undefined');
    }

    return data.result;
  }

  private async zabbixLogin(): Promise<string> {
    return this.zabbixRequest<string>('user.login', {
      username: ENV.IFORTE_ZABBIX_USERNAME,
      password: ENV.IFORTE_ZABBIX_PASSWORD,
    });
  }

  private async zabbixGetGraphs(sessionid: string): Promise<ZabbixGraph[]> {
    return this.zabbixRequest<ZabbixGraph[]>(
      'graph.get',
      {
        output: ['graphid', 'name'],
        search: { name: ENV.IFORTE_ZABBIX_GRAPH_NAME_FILTER },
        startSearch: true,
        selectItems: ['name'],
        sortfield: 'graphid',
        sortOrder: 'ASC',
      },
      sessionid,
    );
  }

  private async syncToEndpoint(batch: SyncGraphData[]) {
    const response = await fetch(ENV.NIS_GRAPH_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.NIS_TOKEN}`,
      },
      body: JSON.stringify({
        data: batch.map((item) => ({
          subscriber_id: item.subscriberId,
          graph_id: `${ENV.IFORTE_GRAPH_ID_PREFIX}${item.graphid}`,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sync endpoint error: ${response.status} ${response.statusText}. ${body}`);
    }
  }
}
