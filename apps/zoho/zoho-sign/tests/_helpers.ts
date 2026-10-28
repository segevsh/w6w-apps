/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockSignCtx([{ body: { code: 0, status: "success", templates: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/api/v1/templates");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test that makes
 * an unexpected extra request fails instead of hanging.
 */
import type { FileCapability, FileRef, HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204). String -> verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (Array.isArray(raw)) { for (const [k, v] of raw) headers[k.toLowerCase()] = String(v); }
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : init.body instanceof Uint8Array
      ? new TextDecoder().decode(init.body)
      : String(init.body);

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${
          calls[calls.length - 1].method
        } ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/**
 * A fake `ctx.file` capability: `read` hands back a fixed byte buffer for any ref/id, `create`
 * mints an in-memory ref. Enough for exercising `request-create`/`template-create` without a
 * real host file store.
 */
export function mockFileCapability(
  bytes = new TextEncoder().encode("%PDF-1.4 fake"),
): FileCapability {
  return {
    read(ref: FileRef | string) {
      const isRef = typeof ref !== "string";
      return Promise.resolve({
        ref: isRef ? ref : {
          kind: "file",
          id: ref,
          contentType: "application/pdf",
          size: bytes.length,
          filename: "document.pdf",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
        bytes,
      });
    },
    create(fileBytes: Uint8Array, meta: { contentType: string; filename: string }) {
      return Promise.resolve({
        kind: "file",
        id: "mock-file-id",
        contentType: meta.contentType,
        size: fileBytes.length,
        filename: meta.filename,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
    },
  };
}

/**
 * Zoho Sign's client resolves the regional API host from the Connection — exactly what
 * `afterConnect` records.
 */
export function mockSignCtx(
  responses: MockResponse[] = [],
  apiHost = "sign.zoho.com",
  withFile = false,
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.zoho-sign",
    auth: "oauth2-us",
    status: "live",
    display: { apiHost, region: "United States" },
  };
  if (withFile) {
    (mock.ctx as { file?: FileCapability }).file = mockFileCapability();
  }
  return mock;
}
