import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, CONTROL_BASE_URL } from "../lib/client.ts";

/**
 * Pinecone API key, sent in an **`Api-Key` header** — not `Authorization`, and
 * with no scheme word. That is Pinecone's own security scheme
 * (`type: apiKey, in: header, name: Api-Key`).
 *
 * ## A key belongs to a project, and that is the whole permission model
 *
 * Pinecone keys are created inside a **project**, and a key can only see that
 * project's indexes. There is no org-wide key here and no `whoami` endpoint —
 * which is why this connection has no user or account name to show, and why
 * `test` reports what the key can *see* instead: how many indexes are in its
 * project. That is the honest answer to "is this the right key", because a key
 * from the wrong project authenticates perfectly and finds nothing.
 *
 * (Pinecone's Admin API, which does manage projects and keys, authenticates
 * with a service account through OAuth client credentials — a different
 * credential for a different job, and not one a workflow needs.)
 *
 * ## The two auth failures are plain text, not JSON
 *
 * Measured against `api.pinecone.io` 2026-08-18. Both answer `401` with
 * `content-type: text/html` and a body of a dozen-odd bytes:
 *
 *   - a wrong or revoked key → `Invalid API key`
 *   - no `Api-Key` header at all → `Missing api-key header`
 *
 * Every other Pinecone error is a JSON envelope, so a client that assumes JSON
 * reports a parse failure instead of the reason. `test` reads the text.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Pinecone API key from the console. Keys are scoped to one project — a key from another " +
    "project connects successfully and sees none of your indexes.",
  connectionLabel: "{{project}}",
  apiKey: { in: "header", name: "Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.pinecone.io → your project → API keys. Starts with `pcsk_`.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // `Api-Key`, not `Authorization`, and no scheme word.
    request.headers["api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /indexes` is the cheapest call that proves the key works, and it is
   * also the only one that says anything about *which* project the key belongs
   * to — by listing what that project contains.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${CONTROL_BASE_URL}/indexes`, {
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "x-pinecone-api-version": API_VERSION,
      },
    });
    if (res.status === 401 || res.status === 403) {
      // Plain text, not JSON — see the note above.
      const body = (await res.text().catch(() => "")).trim();
      if (/missing api-key/i.test(body)) {
        return { ok: false, message: "Pinecone saw no Api-Key header — the key never arrived" };
      }
      if (/unsupported api version/i.test(body)) {
        return { ok: false, message: `Pinecone rejected API version ${API_VERSION}: ${body}` };
      }
      return {
        ok: false,
        message: `Pinecone rejected the API key (${res.status}): ${body || "no detail"}`,
      };
    }
    if (!res.ok) return { ok: false, message: `Pinecone returned ${res.status}` };

    const body = await res.json().catch(() => null) as { indexes?: unknown[] } | null;
    const count = Array.isArray(body?.indexes) ? body.indexes.length : undefined;
    return {
      ok: true,
      message: count === undefined
        ? undefined
        : count === 0
        ? "connected — this project has no indexes yet"
        : `connected — ${count} index${count === 1 ? "" : "es"} visible`,
    };
  },

  /**
   * Records what the key can reach, never the key. There is no project *name*
   * to be had — no endpoint returns one for an API key — so the label is built
   * from what is actually knowable: the regions this project's indexes live in.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${CONTROL_BASE_URL}/indexes`, {
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "x-pinecone-api-version": API_VERSION,
      },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as
      | { indexes?: Array<{ spec?: { serverless?: { cloud?: string; region?: string } } }> }
      | null;
    const indexes = body?.indexes ?? [];
    const regions = [
      ...new Set(
        indexes
          .map((i) => {
            const s = i.spec?.serverless;
            return s?.cloud && s?.region ? `${s.cloud}/${s.region}` : undefined;
          })
          .filter(Boolean) as string[],
      ),
    ];
    return {
      indexCount: indexes.length,
      regions,
      project: regions.length ? `Pinecone (${regions.join(", ")})` : "Pinecone project",
    };
  },
};

export default apiKey;
