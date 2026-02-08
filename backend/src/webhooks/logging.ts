/**
 * Structured logging for webhook events
 */

interface LogMetadata {
  [key: string]: unknown;
}

export interface WebhookLogEntry {
  timestamp: string;
  source: 'webhook';
  eventType: string;
  eventId: string;
  level?: 'info' | 'error';
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Log webhook event with structured JSON output
 * 
 * @param eventType - Type of event being logged (e.g., 'verified', 'processed', 'duplicate')
 * @param eventId - Unique event ID
 * @param metadata - Additional metadata to include in log
 */
export function logWebhook(
  eventType: string,
  eventId: string,
  metadata?: LogMetadata
): void {
  const timestamp = new Date().toISOString();
  const logEntry: WebhookLogEntry = {
    timestamp,
    source: 'webhook',
    eventType,
    eventId,
    level: 'info',
    ...metadata,
  };
  
  // JSON output for production log aggregation
  console.log(JSON.stringify(logEntry));
}

/**
 * Log webhook error with stack trace
 * 
 * @param eventType - Type of error (e.g., 'verification-failed', 'handler-failed')
 * @param eventId - Unique event ID (or 'unknown' if not available)
 * @param error - Error object
 * @param metadata - Additional metadata to include in log
 */
export function logWebhookError(
  eventType: string,
  eventId: string,
  error: Error,
  metadata?: LogMetadata
): void {
  const timestamp = new Date().toISOString();
  const logEntry: WebhookLogEntry = {
    timestamp,
    source: 'webhook',
    eventType,
    eventId,
    level: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...metadata,
  };
  
  // JSON output for production log aggregation
  console.error(JSON.stringify(logEntry));
}

/**
 * Log webhook metrics (for monitoring/alerting)
 * 
 * This is a placeholder for future metrics integration (Prometheus, DataDog, etc.)
 * 
 * Example metrics to track:
 * - webhook.received.total (counter)
 * - webhook.verified.total (counter)
 * - webhook.failed.total (counter)
 * - webhook.duplicate.total (counter)
 * - webhook.processing_duration_ms (histogram)
 * - webhook.handler_errors.total (counter by event type)
 */
export function recordWebhookMetric(
  metricName: string,
  value: number,
  labels?: Record<string, string>
): void {
  // Placeholder for metrics integration
  // Future: Push to Prometheus pushgateway, DataDog StatsD, CloudWatch, etc.
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    type: 'metric',
    metric: metricName,
    value,
    labels,
  }));
}

