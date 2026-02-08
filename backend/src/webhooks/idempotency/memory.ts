/**
 * In-memory idempotency store implementation
 * 
 * WARNING: Not production-safe - state is lost on server restart.
 * For production, migrate to database-backed storage (PostgreSQL, Redis, etc.)
 */

import { IdempotencyStore } from './store.js';

interface EventRecord {
    eventId: string;
    timestamp: number;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
    private events: Map<string, EventRecord> = new Map();
    private readonly ttlMs: number;

    /**
     * @param ttlMs - Time to live in milliseconds (default: 24 hours)
     */
    constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
        this.ttlMs = ttlMs;

        // Run cleanup every hour
        setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }

    async has(eventId: string): Promise<boolean> {
        const record = this.events.get(eventId);

        if (!record) {
            return false;
        }

        // Check if record has expired
        const age = Date.now() - record.timestamp;
        if (age > this.ttlMs) {
            this.events.delete(eventId);
            return false;
        }

        return true;
    }

    async record(eventId: string): Promise<void> {
        this.events.set(eventId, {
            eventId,
            timestamp: Date.now(),
        });
    }

    async cleanup(): Promise<void> {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [eventId, record] of this.events.entries()) {
            const age = now - record.timestamp;
            if (age > this.ttlMs) {
                expiredKeys.push(eventId);
            }
        }

        for (const key of expiredKeys) {
            this.events.delete(key);
        }

        if (expiredKeys.length > 0) {
            console.log(`[webhook:idempotency] Cleaned up ${expiredKeys.length} expired events`);
        }
    }

    /**
     * Get the number of stored events (for debugging)
     */
    size(): number {
        return this.events.size;
    }
}
