import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * Statuspage API key, sent as `Authorization: OAuth <key>`.
 *
 * The scheme word is **`OAuth`**, not `Bearer` — Statuspage's documented format,
 * and an unusual enough choice that a client assuming `Bearer` fails with the
 * same "Could not authenticate" a wrong key produces. There is no OAuth flow
 * behind it; it is a static key from the Statuspage account's own settings.
 *
 * ## The page id, and why it is on the connection
 *
 * Every write names a page, and one API key can reach several. Recording it
 * here means the actions do not each ask for it, while leaving it overridable
 * for an account that genuinely runs more than one — an internal page beside a
 * public one, say.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Statuspage API key from Account settings → API info. Sent with the `OAuth` scheme word, " +
    "which is Statuspage's own convention rather than a mistake.",
  connectionLabel: "{{pageName}}",
  apiKey: { in: "header", name: "Authorization", prefix: "OAuth " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Statuspage → Account settings (top-right menu) → API info.",
    },
    {
      key: "pageId",
      label: "Page ID",
      type: "string",
      default: "",
      hint: "Optional. Leave blank to use the only page this key can reach; set it when the " +
        "account runs several.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // `OAuth`, not `Bearer`.
    request.headers["authorization"] = `OAuth ${apiKey}`;
    return request;
  },

  /**
   * `GET /pages` — the cheapest call that proves the key works, and the only
   * one that needs no page id. It also reports which pages the key reaches,
   * which is the answer to "why does my write 404".
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${BASE_URL}/pages`, {
      headers: { authorization: `OAuth ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) {
      await res.body?.cancel();
      return { ok: false, message: "Statuspage could not authenticate this key" };
    }
    if (res.status === 429 || res.status === 420) {
      await res.body?.cancel();
      return {
        ok: false,
        message: "rate limited — Statuspage allows one request per second per key",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Statuspage returned ${res.status}` };
    }

    const pages = await res.json().catch(() => null) as Array<{ name?: string }> | null;
    const count = Array.isArray(pages) ? pages.length : 0;
    return {
      ok: true,
      message: count === 1 ? `connected to ${pages?.[0]?.name}` : `${count} pages reachable`,
    };
  },

  /**
   * Records the page every action defaults to. When the key reaches exactly one
   * page — the common case — it is resolved here so nothing has to ask.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey, pageId } = credential as { apiKey: string; pageId?: string };
    const res = await ctx.fetch(`${BASE_URL}/pages`, {
      headers: { authorization: `OAuth ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return { pageId };
    }
    const pages = await res.json().catch(() => []) as Array<
      { id?: string; name?: string; subdomain?: string }
    >;
    const chosen = pageId
      ? pages.find((p) => p.id === pageId) ?? { id: pageId }
      : pages.length === 1
      ? pages[0]
      : undefined;

    return {
      pageId: chosen?.id ?? pageId,
      pageName: chosen?.name ?? chosen?.id ?? "Statuspage",
      subdomain: chosen?.subdomain,
      pageCount: pages.length,
    };
  },
};

export default apiKey;
