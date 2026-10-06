/**
 * A webhook subscription's `secret` signs every delivery, and Superchat returns
 * it in the clear on EVERY read (list, get, create, update). Run records keep
 * action outputs, so reads blank it; only `webhook-create` hands it back, once,
 * because that is when a workflow has to store it to verify deliveries.
 */
export const REDACTED = "[redacted]";

export function redactWebhook<T>(webhook: T): T {
  if (!webhook || typeof webhook !== "object") return webhook;
  const w = webhook as Record<string, unknown>;
  if (w.secret === undefined || w.secret === null) return webhook;
  return { ...w, secret: REDACTED } as T;
}
