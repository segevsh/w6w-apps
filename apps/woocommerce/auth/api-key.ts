import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";

/**
 * Inlined base64 encoder — the app sandbox has `import: false`, so we can't
 * pull from jsr:@std/encoding at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

/**
 * REST API key (`api-key`) — the only auth WooCommerce offers for server-to-
 * server calls. Each store admin mints a Consumer Key / Consumer Secret pair at
 * WooCommerce → Settings → Advanced → REST API, scoped Read or Read/Write.
 *
 * Over HTTPS these are sent as HTTP Basic auth — the Consumer Key as the
 * username and the Consumer Secret as the password (`Authorization: Basic
 * base64(ck:cs)`). The store's own URL is per-connection: we store it as
 * `storeUrl` on the credential and republish it as `connection.display.storeUrl`
 * so action code (which only sees the redacted connection) can build the base
 * URL.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "REST API Key",
  description:
    "Consumer Key + Consumer Secret from WooCommerce → Settings → Advanced → REST API, sent as HTTP Basic auth over HTTPS.",
  connectionLabel: "{{store.host}}",
  fields: [
    {
      key: "storeUrl",
      label: "Store URL",
      type: "string",
      required: true,
      placeholder: "https://shop.example.com",
      hint: "Base URL of your WooCommerce store, without a trailing `/wp-json`.",
    },
    {
      key: "consumerKey",
      label: "Consumer Key",
      type: "secret",
      required: true,
      placeholder: "ck_...",
      hint: "Generated at WooCommerce → Settings → Advanced → REST API.",
    },
    {
      key: "consumerSecret",
      label: "Consumer Secret",
      type: "secret",
      required: true,
      placeholder: "cs_...",
      hint: "Shown once when the key is created; Read/Write scope is needed for the write actions.",
    },
  ],

  sign({ request, credential }) {
    const { consumerKey, consumerSecret } = credential as {
      consumerKey: string;
      consumerSecret: string;
    };
    const token = encodeBase64(`${consumerKey}:${consumerSecret}`);
    request.headers["authorization"] = `Basic ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { storeUrl, consumerKey, consumerSecret } = credential as {
      storeUrl?: string;
      consumerKey?: string;
      consumerSecret?: string;
    };
    if (!storeUrl || !consumerKey || !consumerSecret) {
      return { ok: false, message: "credential missing storeUrl / consumerKey / consumerSecret" };
    }
    const baseUrl = resolveBaseUrl({ storeUrl });
    const token = encodeBase64(`${consumerKey}:${consumerSecret}`);
    const res = await ctx.fetch(`${baseUrl}/system_status`, {
      headers: { authorization: `Basic ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `WooCommerce returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { storeUrl } = credential as { storeUrl?: string };
    let host = "";
    try {
      host = storeUrl ? new URL(storeUrl).host : "";
    } catch { /* leave blank */ }
    return { storeUrl, store: { host } };
  },
};

export default apiKey;
