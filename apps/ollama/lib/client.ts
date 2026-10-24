import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Ollama's REST API — verified against the official reference
 * (`github.com/ollama/ollama/blob/main/docs/api.md`) and against a running
 * Ollama 0.34.1 server on 2026-10-22.
 *
 * ## The server is the user's, so the address is the connection
 *
 * Ollama is software somebody runs on their own machine. There is no vendor
 * host to put in an allowlist: the user types the **host**, **port** and
 * **scheme** when they connect, and every request is built from those by
 * {@link buildBaseUrl} — the one place an address is assembled and validated.
 * The manifest admits the destination with `network.allow: ["*"]`, as
 * `homeassistant` does, because the host cannot be known in advance.
 *
 * ## It has to be reachable from wherever workflows run
 *
 * - A LAN or localhost address works only when the workflow runner is on that
 *   same network (a self-hosted runner). A hosted runner needs a tunnel or a
 *   reverse proxy with a public hostname.
 * - Ollama binds `127.0.0.1` by default, so even another machine on the same
 *   LAN is refused until the server is started with `OLLAMA_HOST=0.0.0.0`.
 *
 * ## There is no authentication — unless somebody put some in front
 *
 * Ollama itself has no auth. People put it behind a reverse proxy that wants a
 * bearer token, so the API key is optional and `Authorization` is sent only
 * when one is set (see `auth/server.ts`).
 *
 * ## Everything here is non-streaming
 *
 * Ollama streams newline-delimited JSON by default. A workflow step wants one
 * result, so every call that can stream sets `stream: false`.
 */

export const DEFAULT_PORT = 11434;

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** The three fields a user types to say where their server is. */
export interface OllamaEndpoint {
  scheme: "http" | "https";
  host: string;
  port: number;
}

/** Public (redacted-safe) connection metadata. Never holds the API key. */
export interface OllamaConnectionDisplay {
  baseUrl?: string;
  scheme?: string;
  host?: string;
  port?: number;
  endpoint?: string;
  version?: string;
  authenticated?: boolean;
}

const HOSTNAME =
  /^(?=.{1,253}$)[A-Za-z0-9_](?:[A-Za-z0-9_-]*[A-Za-z0-9_])?(?:\.[A-Za-z0-9_](?:[A-Za-z0-9_-]*[A-Za-z0-9_])?)*$/;
const IPV6 = /^[0-9A-Fa-f:.]+$/;

/**
 * Validate the three connection fields and return them in canonical form.
 *
 * Strict on purpose. The host is interpolated into a URL that the runtime then
 * sends traffic to, so anything that could smuggle in a path, credentials, a
 * query or a second host is refused rather than cleaned up:
 *
 * - `http://10.0.0.5` or `10.0.0.5/api` — the user pasted a URL. Refused, with
 *   a message that says which field each part belongs in.
 * - `user:pass@10.0.0.5` — credentials in the host. Refused.
 * - `10.0.0.5:11434` — a port in the host field. Refused, because a second
 *   source of truth for the port is how the two end up disagreeing.
 * - IPv6 is accepted bare (`::1`) or bracketed (`[::1]`).
 *
 * The port may arrive as a number or a numeric string (a form field), and
 * blank means the default, 11434.
 */
export function parseEndpoint(
  raw: { scheme?: unknown; host?: unknown; port?: unknown },
): OllamaEndpoint {
  const schemeText = String(raw.scheme ?? "").trim().toLowerCase();
  const scheme = schemeText === "" ? "http" : schemeText;
  if (scheme !== "http" && scheme !== "https") {
    throw new Error(`the scheme must be "http" or "https", got ${JSON.stringify(schemeText)}`);
  }

  let host = String(raw.host ?? "").trim();
  if (!host) {
    throw new Error("the Ollama server's host (an IP address or hostname) is required");
  }
  if (/:\/\//.test(host)) {
    throw new Error(
      "the host must be just an IP address or hostname — no `http://`. Choose the scheme in the " +
        "Scheme field and the port in the Port field",
    );
  }
  if (host.includes("@")) {
    throw new Error("the host must not contain credentials (`user@`) — use the API key field");
  }
  if (/[\s/\\?#%]/.test(host)) {
    throw new Error(
      `the host must be just an IP address or hostname, got ${JSON.stringify(host)} — a path, ` +
        "query or whitespace does not belong here",
    );
  }

  let hostForUrl: string;
  if (host.startsWith("[")) {
    if (!host.endsWith("]") || !IPV6.test(host.slice(1, -1)) || !host.includes(":")) {
      throw new Error(`the host ${JSON.stringify(host)} is not a valid bracketed IPv6 address`);
    }
    host = host.slice(1, -1);
    hostForUrl = `[${host}]`;
  } else if (host.includes(":")) {
    const colons = host.split(":").length - 1;
    if (colons >= 2 && IPV6.test(host)) {
      hostForUrl = `[${host}]`;
    } else {
      throw new Error(
        `the host ${JSON.stringify(host)} contains a port — put the port in the Port field`,
      );
    }
  } else {
    if (!HOSTNAME.test(host)) {
      throw new Error(`the host ${JSON.stringify(host)} is not a valid IP address or hostname`);
    }
    hostForUrl = host;
  }

  const portText = String(raw.port ?? "").trim();
  // Digits only: `Number()` would read "1e3" as 1000 and "0x50" as 80.
  const port = portText === "" ? DEFAULT_PORT : /^\d+$/.test(portText) ? Number(portText) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `the port must be a whole number from 1 to 65535, got ${JSON.stringify(portText)}`,
    );
  }

  // The URL parser is the final judge: if it disagrees with what we meant (an
  // octal-looking IPv4, an out-of-range octet), the address is not what the
  // user thinks it is, and sending traffic to it would be a guess.
  let parsed: URL;
  try {
    parsed = new URL(`${scheme}://${hostForUrl}:${port}`);
  } catch {
    throw new Error(`the host ${JSON.stringify(host)} does not form a valid address`);
  }
  // IPv6 is re-serialised in compressed form, which is harmless; for anything
  // else a changed hostname means the parser read a different address.
  if (!hostForUrl.startsWith("[") && parsed.hostname !== host.toLowerCase()) {
    throw new Error(
      `the host ${JSON.stringify(host)} is read as ${parsed.hostname} — check the address`,
    );
  }

  return { scheme, host: hostForUrl.startsWith("[") ? host : host.toLowerCase(), port };
}

/**
 * The server's origin — `http://192.168.1.50:11434` — built from the user's
 * three connection fields. Every request in this app goes through this.
 */
export function buildBaseUrl(
  raw: { scheme?: unknown; host?: unknown; port?: unknown },
): string {
  const { scheme, host, port } = parseEndpoint(raw);
  const hostPart = host.includes(":") ? `[${host}]` : host;
  return `${scheme}://${hostPart}:${port}`;
}

/** `host:port`, for labels and messages. */
export function endpointLabel(raw: { host?: unknown; port?: unknown }): string {
  const { host, port } = parseEndpoint({ host: raw.host, port: raw.port });
  return `${host.includes(":") ? `[${host}]` : host}:${port}`;
}

/**
 * Whether a host is on a network a hosted runner cannot see: loopback, RFC 1918
 * private ranges, link-local, CGNAT (Tailscale-style 100.64/10), `.local`,
 * `.lan`/`.internal`/`.home.arpa`, or a bare single-label name such as a Docker
 * service or a LAN machine name.
 */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.includes(":")) {
    return h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h);
  }
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (/\.(local|lan|internal|home\.arpa|home|localdomain)$/.test(h)) return true;
  return !h.includes(".");
}

/**
 * Read the server's address off the redacted Connection. Re-validated through
 * {@link buildBaseUrl}, so a tampered display record cannot redirect traffic to
 * something the parser would refuse.
 */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as OllamaConnectionDisplay;
  if (!display.host) {
    throw new Error(
      "this connection has no Ollama host recorded — reconnect it so the app knows which " +
        "server to reach",
    );
  }
  return buildBaseUrl({ scheme: display.scheme, host: display.host, port: display.port });
}

/** Drop keys the caller left unset, so a server default is not overwritten with nothing. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** A required, trimmed string param. */
export function requiredString(value: unknown, field: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required`);
  return text;
}

/** An optional string param, or undefined when blank. */
export function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

/** An optional numeric param, or undefined when blank. Rejects NaN. */
export function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`\`${field}\` must be a number, got ${String(value)}`);
  return n;
}

/**
 * Images are sent to Ollama as **raw base64** — no `data:image/png;base64,`
 * prefix. People copy data URIs out of other tools, so the prefix is stripped
 * rather than letting Ollama fail with a decode error that does not say why.
 * Accepts an array, a JSON array string, or newline/comma separated text.
 */
export function images(value: unknown): string[] | undefined {
  let list: unknown[];
  if (Array.isArray(value)) list = value;
  else if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (text.startsWith("[")) {
      list = json(text, "images") as unknown[];
      if (!Array.isArray(list)) throw new Error("`images` must be a list of base64 strings");
    } else {
      list = text.split(/[\n,]/);
    }
  } else return undefined;
  const out = list
    .map((v) => String(v ?? "").trim().replace(/^data:[^;,]*;base64,/i, ""))
    .filter(Boolean);
  return out.length ? out : undefined;
}

/**
 * `keep_alive` is a duration string (`"5m"`) or a number of seconds, where `0`
 * unloads immediately and `-1` never unloads. A form field delivers `"0"` and
 * `"-1"` as strings, which Ollama would read as durations — so a bare number is
 * sent as a number.
 */
export function keepAlive(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (!text) return undefined;
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

/**
 * `format` is `"json"` or a JSON Schema object for structured output. A blank
 * field means free text.
 */
export function format(value: unknown): string | Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.toLowerCase() === "json") return "json";
  const parsed = json(text, "format");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('`format` must be blank, "json", or a JSON Schema object');
  }
  return parsed as Record<string, unknown>;
}

/**
 * `think` for reasoning models: `true`/`false` for most, `low`/`medium`/`high`
 * for models that take an effort level. Blank leaves the model's own default,
 * which is different between models.
 */
export function think(value: unknown): boolean | string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  if (["low", "medium", "high"].includes(text)) return text;
  throw new Error('`think` must be blank, true, false, "low", "medium" or "high"');
}

/**
 * Model options. The free-form `options` object takes everything Ollama
 * documents (`top_k`, `stop`, `repeat_penalty`, …) and the four named params
 * are the common ones, which win over the same key in `options`.
 */
export function modelOptions(p: Record<string, unknown>): Record<string, unknown> | undefined {
  const base = json(p.options, "options");
  if (base !== undefined && (base === null || typeof base !== "object" || Array.isArray(base))) {
    throw new Error('`options` must be a JSON object such as {"top_k": 40}');
  }
  const merged = compact({
    ...(base as Record<string, unknown> | undefined),
    temperature: optionalNumber(p.temperature, "temperature"),
    seed: optionalNumber(p.seed, "seed"),
    num_predict: optionalNumber(p.numPredict, "numPredict"),
    num_ctx: optionalNumber(p.numCtx, "numCtx"),
  });
  return Object.keys(merged).length ? merged : undefined;
}

/**
 * Turn an Ollama error into something actionable. The body is
 * `{"error": "..."}`; the status carries the meaning.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string };
    if (body?.error) detail = body.error;
  } catch { /* a proxy's HTML or plain-text page */ }

  if (status === 401 || status === 403) {
    return `${detail || "unauthorized"} — Ollama itself has no authentication, so this came from ` +
      "a reverse proxy in front of it. Check the API key on the connection";
  }
  if (status === 404) {
    return `${detail || "not found"} — if it names a model, it is not on this server: ` +
      "`model-list` shows what is installed and `model-pull` downloads one";
  }
  if (status === 400) return detail || "bad request";
  if (status === 502 || status === 503 || status === 504) {
    return `${detail || `HTTP ${status}`} — a gateway in front of Ollama could not get an ` +
      "answer from it. The server may be down, still loading a model, or the proxy timed out " +
      "waiting for a slow generation or pull";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the API key — the runtime routes
 * every request through the auth `sign` hook.
 */
export class OllamaClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.base}${path}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Ollama ${res.status} for ${init.method} ${path}: ${describeError(res.status, text)}`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Ollama did not return JSON for ${init.method} ${path}: ${text.slice(0, 160)}`,
      );
    }
  }
}

/** Nanosecond durations in Ollama's final response, as seconds. */
export function seconds(ns: unknown): number | undefined {
  return typeof ns === "number" && Number.isFinite(ns) ? ns / 1e9 : undefined;
}

/** The token-count and timing fields every generate/chat/embed response ends with. */
export function usage(r: Record<string, unknown> | undefined) {
  return {
    promptTokens: r?.prompt_eval_count as number | undefined,
    completionTokens: r?.eval_count as number | undefined,
    totalSeconds: seconds(r?.total_duration),
    loadSeconds: seconds(r?.load_duration),
  };
}
