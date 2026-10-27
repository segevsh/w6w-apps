import type { HookContext } from "@w6w/types";

/**
 * Ollama Cloud's REST API — the same `/api/*` surface a local Ollama server
 * speaks, served by the vendor at `https://ollama.com` and paid for with an API
 * key (`Authorization: Bearer <key>`, minted at
 * https://ollama.com/settings/keys).
 *
 * ## The base URL is not a connection field
 *
 * A local Ollama server is reached at an address the user types (see
 * `apps/ollama`); the cloud is a single vendor host, so {@link BASE_URL} is a
 * constant and the only connection field is the key. That is also why the
 * manifest can name the destination exactly — `network.allow: ["ollama.com"]`
 * — instead of admitting `*`.
 *
 * ## Everything here is non-streaming
 *
 * Ollama streams newline-delimited JSON by default. A workflow step wants one
 * result, so every call that can stream sets `stream: false`.
 */

/** The one origin this app talks to. Every request in the app is built from it. */
export const BASE_URL = "https://ollama.com";

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
 * rather than letting the API fail with a decode error that does not say why.
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
 * Turn an Ollama Cloud error into something actionable. The body is
 * `{"error": "..."}`; the status carries the meaning.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string };
    if (body?.error) detail = body.error;
  } catch { /* an HTML or plain-text page from a gateway */ }

  if (status === 401 || status === 403) {
    return `${detail || "unauthorized"} — Ollama Cloud rejected the API key: check it at ` +
      "https://ollama.com/settings/keys and that it has not been revoked";
  }
  if (status === 404) {
    return `${detail || "not found"} — if it names a model, the key has no access to it on ` +
      "Ollama Cloud: `model-list` shows the models this account can call";
  }
  if (status === 400) return detail || "bad request";
  if (status === 429) {
    return `${detail || "rate limited"} — the account's Ollama Cloud limit for this window is ` +
      "used up; the `quota` health check reports the headroom that is left";
  }
  if (status === 502 || status === 503 || status === 504) {
    return `${detail || `HTTP ${status}`} — Ollama Cloud could not answer: the model may still ` +
      "be starting up, or the service is briefly unavailable";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` against {@link BASE_URL}. It never sets the API
 * key — the runtime routes every request through the auth `sign` hook.
 */
export class OllamaCloudClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${BASE_URL}${path}`;
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
        `Ollama Cloud ${res.status} for ${init.method} ${path}: ` +
          describeError(res.status, text),
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Ollama Cloud did not return JSON for ${init.method} ${path}: ${text.slice(0, 160)}`,
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
