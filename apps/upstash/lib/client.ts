import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Upstash Redis database has its own unique REST URL
 * (`https://<db-id>.upstash.io`) — there is no shared API host a manifest
 * could hardcode. The URL is not secret (only the token is), so it is safe
 * to read off the Connection's redacted `display`, which the auth method's
 * `afterConnect` populates from the same field the user entered at connect
 * time. Same pattern as Zendesk's per-account subdomain — see
 * `../../zendesk/lib/client.ts`.
 */
export function restUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { restUrl?: string };
  if (display.restUrl) return display.restUrl.replace(/\/+$/, "");
  throw new Error(
    "Upstash connection has no REST URL — reconnect the database so it can be recorded.",
  );
}

export interface CommandResult<T> {
  result: T;
}

/** Split a comma-separated form field into a list. Blank input -> empty list. */
export function csv(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Upstash's REST `HGETALL` mirrors RESP2 and returns a flat array —
 * `[field1, value1, field2, value2, ...]` — rather than a JSON object. Fold
 * it into a plain object so a workflow can address a field by name instead
 * of doing index arithmetic on the raw wire shape.
 */
export function pairsToObject(flat: unknown): Record<string, string> {
  const arr = Array.isArray(flat) ? flat : [];
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < arr.length; i += 2) out[String(arr[i])] = String(arr[i + 1]);
  return out;
}

/**
 * Thin wrapper over Upstash's path-style REST command format:
 * `POST /<COMMAND>/<arg1>/<arg2>/...` — one HTTP request per Redis command,
 * each argument URL-encoded into its own path segment. `POST` is used
 * uniformly (documented as supported for every single-command call,
 * alongside GET/PUT) so values containing characters that upset an
 * intermediary's URL handling are no worse off than any other segment.
 *
 * Never sets `Authorization` — the runtime routes every request through the
 * auth `sign` hook, which is the only code that ever sees the REST token.
 *
 * See https://upstash.com/docs/redis/features/restapi.
 */
export class UpstashClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = restUrlFromConnection(ctx.connection);
  }

  async command<T = unknown>(...args: Array<string | number>): Promise<CommandResult<T>> {
    const path = args.map((a) => encodeURIComponent(String(a))).join("/");
    const res = await this.ctx.fetch(`${this.base}/${path}`, { method: "POST" });
    const text = await res.text();
    const body = text ? (JSON.parse(text) as { result?: T; error?: string }) : {};
    if (!res.ok || body.error !== undefined) {
      throw new Error(
        `Upstash ${res.status} for ${String(args[0])}: ${body.error ?? res.statusText}`,
      );
    }
    return { result: body.result as T };
  }
}
