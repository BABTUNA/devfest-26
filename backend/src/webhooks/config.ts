/**
 * Flowglad webhook configuration
 */

export interface WebhookConfig {
    secret: string;
    mode: 'test' | 'live';
}

export function getWebhookConfig(): WebhookConfig {
    const mode = (process.env.FLOWGLAD_WEBHOOK_MODE || 'test') as 'test' | 'live';

    // Support mode-specific secrets or fallback to general secret
    const secretKey = mode === 'live'
        ? `FLOWGLAD_WEBHOOK_SECRET_LIVE`
        : `FLOWGLAD_WEBHOOK_SECRET_TEST`;

    const secret = process.env[secretKey] || process.env.FLOWGLAD_WEBHOOK_SECRET;

    if (!secret) {
        throw new Error(
            `Missing webhook secret. Set ${secretKey} or FLOWGLAD_WEBHOOK_SECRET in environment variables.`
        );
    }

    return { secret, mode };
}
