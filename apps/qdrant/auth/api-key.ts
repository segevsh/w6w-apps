import type { AuthDefinition } from "@w6w/types";
import { normalizeUrl } from "../lib/client.ts";

/**
 * A Qdrant API key, sent in an **`api-key` header** — not `Authorization`, and
 * not `Bearer`.
 *
 * Qdrant does accept a bearer JWT as well, for its fine-grained access control,
 * but the ordinary key goes in its own header and sending it as `Bearer` fails.
 *
 * ## Read-only keys exist, and they authenticate perfectly
 *
 * Qdrant's own description of the header is *"Authorization key, either
 * read-write or read-only"*. A read-only key passes the connection test, lists
 * collections, and is refused by every write — which is the correct behaviour
 * and worth knowing before a workflow reaches its first upsert.
 *
 * ## The URL is required and the port matters
 *
 * Qdrant is an open-source database first, so there is no default host to fall
 * back on. The REST API is on **6333** and gRPC on 6334; a URL without a port
 * goes to 443, which on a self-hosted instance is usually nothing at all — so
 * a missing port is filled in rather than left to fail obscurely.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Qdrant API key, sent in an `api-key` header rather than `Authorization`. Keys are " +
    "read-write or read-only, and a read-only key passes every check until the first write.",
  connectionLabel: "Qdrant ({{host}})",
  apiKey: { in: "header", name: "api-key" },
  fields: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://xyz.eu-central-1.aws.cloud.qdrant.io:6333",
      hint: "Qdrant Cloud's connection string includes `:6333`. Self-hosted: wherever it runs — " +
        "the REST port is 6333, and 6334 is gRPC, which is not this API.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "A read-only key is enough for the read actions and is refused by every write.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Its own header, not Authorization.
    request.headers["api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /collections` — the cheapest call that proves both the URL and the key,
   * and the one that reports what is actually in the instance.
   *
   * An instance with no collections is a normal state for a new deployment, and
   * saying so is better than a bare "connected" that leaves somebody wondering
   * whether they pointed at the wrong host.
   */
  async test({ credential }, ctx) {
    const { url, apiKey } = credential as { url?: string; apiKey?: string };
    if (!url) return { ok: false, message: "credential missing the URL" };
    if (!apiKey) return { ok: false, message: "credential missing the API key" };

    let base: string;
    try {
      base = normalizeUrl(url);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/collections`, {
        headers: { "api-key": apiKey, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { ok: false, message: "Qdrant rejected this API key" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `${base} answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { result?: { collections?: Array<{ name?: string }> } }
      | null;
    const collections = body?.result?.collections ?? [];
    const host = new URL(base).host;

    if (collections.length === 0) {
      return {
        ok: true,
        message: `connected to ${host}, which has no collections yet — normal for a new instance`,
      };
    }
    const names = collections.slice(0, 3).map((c) => c.name).filter(Boolean).join(", ");
    return {
      ok: true,
      message: `connected to ${host} — ${collections.length} collections (${names}${
        collections.length > 3 ? ", …" : ""
      })`,
    };
  },

  /** Records the instance. Never the key. */
  afterConnect({ credential }) {
    const { url } = credential as { url: string };
    const base = normalizeUrl(url);
    return { url: base, host: new URL(base).host };
  },
};

export default apiKey;
