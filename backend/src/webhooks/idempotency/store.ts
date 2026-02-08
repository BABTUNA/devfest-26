/**
 * Abstract idempotency store interface
 * 
 * Prevents duplicate webhook event processing
 */

export interface IdempotencyStore {
  /**
   * Check if an event has already been processed
   */
  has(eventId: string): Promise<boolean>;
  
  /**
   * Record that an event has been processed
   */
  record(eventId: string): Promise<void>;
  
  /**
   * Clean up old entries (optional, for TTL-based stores)
   */
  cleanup?(): Promise<void>;
}
