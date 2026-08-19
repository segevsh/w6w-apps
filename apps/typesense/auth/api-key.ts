import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeHost } from "../lib/client.ts";

/**
 * A Typesense API key, sent in `X-TYPESENSE-API-KEY`.
 *
 * ## Which key this is decides what the connection can do
 *
 * Typesense keys carry an **action list** and a **collection list**. Three
 * shapes are common:
 *
 * - The **bootstrap key** (`--api-key` on the server) is unrestricted. It can
 *   drop every collection, so it is the wrong thing to hand a workflow.
 * - An **admin key** created through `/keys` with `["*"]` actions.
 * - A **search-only key** with `["documents:search"]`, which 401s on
 *   everything else.
 *
 * The test reports which actions the key holds, because a connection that can
 * search and cannot index is a perfectly reasonable thing to have and a
 * confusing thing to debug at the first write.
 *
 * ## The test cannot use `/health`
 *
 * `/health` needs no key — that is what makes it a good liveness probe and a
 * useless credential test. This probes `/collections`, which needs one.
 *
 * ## Self-hosted defaults to port 8108
 *
 * A bare hostname gets `https://` and `:8108`. Typesense Cloud serves on 443,
 * so a full URL or an explicit port is left alone. Getting it wrong is a
 * connection refused that reads as the server being down.
 */
const auth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API key",
  apiKey: { in: "header", name: "X-TYPESENSE-API-KEY" },
  connectionLabel: "{{hostLabel}}",
  description:
    "A Typesense API key, sent in the `X-TYPESENSE-API-KEY` header. Typesense keys are SCOPED to " +
    "actions and collections, so the test reports what this one may do — a key that can search " +
    "and not index is normal, and confusing at the first write.",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      required: true,
      placeholder: "https://xyz.a1.typesense.net or typesense.internal",
      hint: "A bare hostname is assumed self-hosted and gets port 8108. Typesense Cloud serves " +
        "on 443, so paste its full URL.",
    },
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "The server's `--api-key` is unrestricted and can drop every collection — prefer a " +
        "key created through `/keys` with only the actions a workflow needs.",
    },
  ],

  sign({ request, credential }) {
    const apiKey = String((credential as Record<string, unknown>)?.apiKey ?? "");
    return {
      ...request,
      headers: { ...request.headers, "x-typesense-api-key": apiKey },
    };
  },

  exchange({ fields }) {
    const values = fields as Record<string, unknown>;
    const host = normalizeHost(values?.host);
    const apiKey = String(values?.apiKey ?? "").trim();
    if (!apiKey) throw new Error("`apiKey` is required");
    return { host, apiKey };
  },

  async test({ credential }, ctx) {
    const host = String((credential as Record<string, unknown>)?.host ?? "");
    let res: Response;
    try {
      // NOT /health — that answers without a key, so it cannot test one.
      res = await ctx.fetch(`${host}/collections`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${host}: ${String(err)}. A self-hosted Typesense listens on ` +
          "port 8108 by default, and a bare hostname pointed at 443 fails exactly like this",
      };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let collections: Array<{ name?: string }> = [];
    try {
      collections = JSON.parse(text) as Array<{ name?: string }>;
    } catch { /* an unexpected shape is still an authenticated call */ }

    // What the key may do is worth knowing before the first write fails.
    let actions = "";
    try {
      const keys = await ctx.fetch(`${host}/keys`, { headers: { accept: "application/json" } });
      if (keys.ok) {
        const body = await keys.json() as { keys?: Array<{ actions?: string[] }> };
        const count = body?.keys?.length ?? 0;
        actions = `. This key can list ${count} key${count === 1 ? "" : "s"}, so it is an ` +
          "administrative key rather than a search-only one";
      } else if (keys.status === 401 || keys.status === 403) {
        actions = ". This key cannot manage keys, so it is a restricted key — which is the right " +
          "shape for a workflow, and means `key-list` and `key-create` will refuse";
      }
    } catch { /* the detail is a convenience, not a gate */ }

    return {
      ok: true,
      message: `reached ${new URL(host).host} — ${collections.length} collection${
        collections.length === 1 ? "" : "s"
      }${actions}`,
    };
  },

  async afterConnect({ credential }, ctx) {
    const host = String((credential as Record<string, unknown>)?.host ?? "");
    let version = "";
    try {
      const res = await ctx.fetch(`${host}/debug`, { headers: { accept: "application/json" } });
      if (res.ok) version = String(((await res.json()) as { version?: string })?.version ?? "");
    } catch { /* the label is a convenience */ }

    return {
      host,
      hostLabel: host ? new URL(host).host : "",
      version,
    };
  },
};

export default auth;
