import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Admin API access token (`custom`).
 *
 * Shopify does not use an Authorization header for the Admin API — the token
 * goes in `X-Shopify-Access-Token`. That is why this is `custom` rather than
 * `bearer`: the type describes what is actually sent.
 *
 * Works for both a custom app's token (`shpat_…`, from the store admin) and an
 * OAuth-issued offline token, since both are presented the same way.
 *
 * The store handle is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "custom",
  displayName: "Admin API Access Token",
  description:
    "Create a custom app under Settings → Apps and sales channels → Develop apps, then install it and copy the Admin API access token.",
  connectionLabel: "{{shopInfo.name}} ({{shop}})",
  fields: [
    {
      key: "shop",
      label: "Store handle",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the handle from `acme.myshopify.com` — not the full URL or a custom domain.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Starts with `shpat_`. Grant the app only the scopes your workflows need.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    // Shopify's own header, not Authorization.
    request.headers["x-shopify-access-token"] = accessToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { shop, accessToken } = credential as { shop?: string; accessToken?: string };
    if (!shop || !accessToken) {
      return { ok: false, message: "credential missing shop or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(shop)}/shop.json`, {
      headers: { "x-shopify-access-token": accessToken },
    });
    if (!res.ok) return { ok: false, message: `Shopify returned ${res.status}` };
    return { ok: true };
  },

  /** Records the store handle so the client can address the right host. */
  async afterConnect({ credential }, ctx) {
    const { shop } = credential as { shop?: string };
    if (!shop) return {};
    const res = await ctx.fetch(`${baseUrl(shop)}/shop.json`);
    if (!res.ok) return { shop };
    const body = await res.json().catch(() => ({})) as {
      shop?: { id?: number; name?: string; email?: string; currency?: string };
    };
    return { shop, shopInfo: body.shop ?? {} };
  },
};

export default accessToken;
