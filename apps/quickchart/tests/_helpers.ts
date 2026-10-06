/**
 * Test helper: a mock `HookContext` with a queued fake `ctx.fetch`, a no-op-ish `ctx.log`, and an
 * optional fake `ctx.file` store. An unqueued fetch throws, so an unexpected extra request fails
 * the test instead of hanging.
 */
import type { FileRef, HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON. String -> verbatim. Uint8Array -> raw bytes. Undefined -> empty. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface Created {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
}

export function mockCtx(responses: MockResponse[] = [], opts: { files?: boolean } = {}) {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const created: Created[] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body: init?.body == null ? null : String(init.body),
    });
    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const b = next.body;
    const body = b === undefined
      ? null
      : typeof b === "string" || b instanceof Uint8Array
      ? b as BodyInit
      : JSON.stringify(b);
    return Promise.resolve(
      new Response(body, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: () => {},
    ...(opts.files
      ? {
        file: {
          create(bytes: Uint8Array, meta: { contentType: string; filename: string }) {
            created.push({ bytes, ...meta });
            const ref: FileRef = {
              kind: "file",
              id: "ref-1",
              contentType: meta.contentType,
              size: bytes.length,
              filename: meta.filename,
              expiresAt: "2030-01-01T00:00:00Z",
            };
            return Promise.resolve(ref);
          },
        },
      }
      : {}),
  } as unknown as HookContext;

  return { ctx, calls, created };
}

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
export const IMG_HEADERS = { "content-type": "image/png" };
export const SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

/** Runs an action's `execute` and types its (always object) result for assertions. */
export async function exec<I>(
  action: { execute?: unknown },
  input: I,
  ctx: HookContext,
  // deno-lint-ignore no-explicit-any
): Promise<Record<string, any>> {
  const fn = action.execute as (i: I, c: HookContext) => unknown;
  return await fn(input, ctx) as Record<string, never>;
}
