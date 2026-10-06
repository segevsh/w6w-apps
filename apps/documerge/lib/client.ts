import type { HookContext, Param } from "@w6w/types";

/** Every DocuMerge endpoint hangs off this one host. */
export const API_BASE = "https://app.documerge.ai";

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

export function compact<T>(obj: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function truncate(text: string, max = 300): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/** Parse a JSON param that may arrive as a value or as a JSON string. */
export function asJson(value: unknown, label: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** As {@link asJson}, but the result must be a JSON object. */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  const parsed = asJson(value, label);
  if (parsed === undefined) return undefined;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** As {@link asJson}, but the result must be a JSON array. */
export function asArray(value: unknown, label: string): unknown[] | undefined {
  const parsed = asJson(value, label);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array`);
  return parsed;
}

/**
 * DocuMerge runs on Laravel, so a failure is `{"message": "..."}`, and a
 * validation failure adds `{"errors": {"field": ["..."]}}`. Fold both into one line.
 */
export function errorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; errors?: unknown };
    const parts: string[] = [];
    if (typeof parsed.message === "string") parts.push(parsed.message);
    if (parsed.errors && typeof parsed.errors === "object") {
      for (const [field, msgs] of Object.entries(parsed.errors as Record<string, unknown>)) {
        parts.push(`${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`);
      }
    }
    return parts.length ? parts.join(" — ") : truncate(raw.trim());
  } catch {
    return truncate(raw.trim());
  }
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const detail = errorMessage(raw);
  return `DocuMerge ${method} ${path} failed with ${status}${detail ? `: ${detail}` : ""}`;
}

/** A `{name, url}` / `{name, contents}` file reference, as the tools endpoints take it. */
export function fileRef(
  input: { fileName?: string; fileUrl?: string; fileContents?: string },
): Record<string, string> {
  const url = input.fileUrl?.trim();
  const contents = input.fileContents?.trim();
  if (!url && !contents) throw new Error("provide a file URL or base64 file contents");
  return compact({ name: input.fileName?.trim(), url, contents }) as Record<string, string>;
}

export const FILE_PARAMS: Param[] = [
  {
    key: "fileName",
    label: "File name",
    type: "string",
    hint: "Name of the file, e.g. report.pdf.",
  },
  {
    key: "fileUrl",
    label: "File URL",
    type: "string",
    hint: "A publicly reachable URL DocuMerge can download. Use this or File contents.",
  },
  {
    key: "fileContents",
    label: "File contents (base64)",
    type: "text",
    hint: "Base64-encoded file bytes, as an alternative to a URL.",
  },
];

/** Thin wrapper over `ctx.fetch`. The Auth `sign` hook stamps the Bearer token. */
export class DocuMergeClient {
  constructor(private ctx: HookContext) {}

  private async send(path: string, options: RequestOptions): Promise<[Response, string]> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}`, init);
    return [res, method];
  }

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const [res, method] = await this.send(path, options);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatError(res.status, method, path, text));
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // The merge endpoints answer a JSON-ish message as text/plain.
      return { message: text.trim() } as T;
    }
  }

  /** For the `/api/tools/*` endpoints, which answer the produced file as bytes. */
  async file(path: string, body: unknown): Promise<{
    contentBase64: string;
    contentType: string;
    size: number;
  }> {
    const [res, method] = await this.send(path, { method: "POST", body });
    if (!res.ok) {
      throw new Error(formatError(res.status, method, path, await res.text().catch(() => "")));
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return {
      contentBase64: btoa(bin),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      size: bytes.length,
    };
  }
}
