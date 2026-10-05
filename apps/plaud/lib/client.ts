import type { HookContext } from "@w6w/types";

/**
 * Plaud Dev API ("Plaud Embedded") client.
 *
 * Verified 2026-10-05 against the OpenAPI documents published at
 * `docs.plaud.ai/openapi/{auth,binding,file,transcription}.json`, the prose in
 * `docs.plaud.ai/llms-full.txt`, and live probes of `platform-{us,jp,eu,sg}.plaud.ai`.
 *
 * ## One base per region
 *
 * Every endpoint is under `https://platform-<region>.plaud.ai/developer/api`. The OpenAPI
 * documents declare two servers (US, Japan). The data-retention page also lists Europe and
 * Singapore as sales-gated, but `platform-eu.plaud.ai` and `platform-sg.plaud.ai` do not
 * resolve in DNS (checked 2026-10-05), so they are left out rather than guessed.
 *
 * ## Three credentials, two request styles
 *
 *  - `client_id` + `secret_key` -> partner token (HTTP Basic) -> per-user token (Bearer).
 *    The user token authenticates device binding and file upload.
 *  - `client_id` + `api_key` (a separate key, NOT the secret) go in `X-Client-Id` /
 *    `X-Client-Api-Key` headers on the Transcription API. See `auth/credentials.ts`.
 *
 * ## Shapes
 *
 *  - Bind/unbind answer `{type, sn, is_bind}`; binding state answers `{is_bind, bind_history}`.
 *  - File upload answers PascalCase (`FileId`, `UploadId`, `ChunkSize`, `Parts[]`) while its
 *    request body is snake_case.
 *  - Errors are not uniform: the auth host answers `{"detail":"CLIENT_NOT_FOUND"}` (401),
 *    the partner endpoints `{"code":403,"message":"…"}`, and an unknown device serial number is
 *    a bare 404 with no body.
 */

export type Region = "us" | "jp";

export const REGIONS: Record<Region, { label: string; host: string; base: string }> = {
  us: {
    label: "US",
    host: "platform-us.plaud.ai",
    base: "https://platform-us.plaud.ai/developer/api",
  },
  jp: {
    label: "Japan",
    host: "platform-jp.plaud.ai",
    base: "https://platform-jp.plaud.ai/developer/api",
  },
};

export const DEFAULT_REGION: Region = "us";

/** Narrow anything a connection or form hands back to a known region. */
export function normalizeRegion(value: unknown): Region {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "") return DEFAULT_REGION;
  if (v === "us" || v === "jp") return v;
  throw new Error(`\`region\` must be "us" or "jp" — got ${JSON.stringify(v.slice(0, 20))}`);
}

export function regionFromConnection(connection: unknown): Region {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  return normalizeRegion(display?.region);
}

/** Device type from the serial-number prefix, per the docs (`881` notepro, `882` notepins). */
export const DEVICE_TYPES = ["notepro", "notepins"] as const;
export type DeviceType = typeof DEVICE_TYPES[number];

export function deviceType(type: unknown, sn: string): DeviceType {
  const t = String(type ?? "").trim().toLowerCase();
  if (t) {
    if ((DEVICE_TYPES as readonly string[]).includes(t)) return t as DeviceType;
    throw new Error(
      `\`type\` must be one of ${DEVICE_TYPES.join(", ")} — got ${JSON.stringify(t)}`,
    );
  }
  if (sn.startsWith("881")) return "notepro";
  if (sn.startsWith("882")) return "notepins";
  throw new Error(
    "`type` could not be derived: Plaud serial numbers starting 881 are notepro and 882 are " +
      "notepins. Set `type` explicitly",
  );
}

export function requireString(value: unknown, field: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`\`${field}\` is required`);
  return s;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Turn a failed response into a message that says which failure mode it was. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { detail?: unknown; message?: unknown; error?: unknown };
    const found = body?.detail ?? body?.message ?? body?.error;
    if (found !== undefined) {
      detail = typeof found === "string" ? found : JSON.stringify(found).slice(0, 300);
    }
  } catch { /* empty or not JSON */ }

  if (status === 401) {
    return `${
      detail || "unauthorized"
    } — the credential was rejected. A user token lasts 24 hours ` +
      "and is re-minted from the client id and secret key; a persistent 401 means the app " +
      "credentials were rotated, or the region does not match where the app lives. The " +
      "Transcription API takes the separate `api_key`, not the secret key";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — for a device bind this means the device is already bound ` +
      "to another account, whose owner must unbind it first";
  }
  if (status === 404) {
    return `${detail || "not found"} — Plaud answers an unknown device serial number with a bare ` +
      "404 and no body, so a wrong serial and a wrong type look identical";
  }
  if (status === 429) return `${detail || "too many requests"} — back off and retry`;
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export class PlaudClient {
  private base: string;

  constructor(private ctx: HookContext, region?: Region) {
    this.base = REGIONS[region ?? regionFromConnection(ctx.connection)].base;
  }

  /** Returns the parsed JSON body. Credentials are stamped by the auth `sign` hook, not here. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Plaud ${res.status}: ${describeError(res.status, text)}`);
    if (!text.trim()) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Plaud returned a non-JSON body: ${text.slice(0, 160)}`);
    }
  }
}
