import pino from 'pino';
import { ENV } from '../config/env';

export const logger = pino({
  transport: { target: 'pino-pretty' },
  level: ENV.NODE_ENV === 'development' ? 'debug' : 'info',
});
