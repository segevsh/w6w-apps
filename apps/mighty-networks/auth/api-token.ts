import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage, NETWORK_ID_PATTERN } from "../lib/client.ts";

/**
 * Mighty Networks Admin API token — `Authorization: Bearer <token>`, scoped to one Network.
 *
 * ## Where the token comes from
 *
 * "Navigate to your Network … **Admin → Settings → API Keys** → Generate New API Key"
 * (<https://docs.mightynetworks.com/authentication>, fetched 2026-10-05). The token is shown once.
 * The OpenAPI document declares `bearerAuth` (`type: http, scheme: bearer`), and every example in
 * the docs sends `Authorization: Bearer YOUR_API_TOKEN`.
 *
 * ## Why the Network ID is collected here
 *
 * Every Admin API route is `/admin/v1/networks/{network_id}/…`, and a key belongs to exactly one
 * Network. Rather than ask for it on every action, it is a non-secret field of the Connection; the
 * runtime exposes non-secret fields to actions as `ctx.connection.display`, and `test` reads it
 * straight off the credential. Either the numeric id or the subdomain works (the spec's
 * `networkId` parameter is `oneOf` integer / `^[a-z][a-z0-9-]+$`).
 *
 * ## Plan gating
 *
 * The Admin API is available on the Scale, Growth and Mighty Pro plans (quick start,
 * <https://docs.mightynetworks.com/quickstart>). A 403 is therefore reported as a permissions /
 * plan problem and kept apart from a rejected token.
 */

export interface MightyCredential {
  networkId: string;
  apiToken: string;
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "Admin API Token",
  description:
    "An Admin API token from Admin → Settings → API Keys in your Mighty Network, plus the " +
    "Network's ID or subdomain. The Admin API needs the Scale, Growth or Mighty Pro plan.",
  connectionLabel: "Mighty Networks ({{networkId}})",
  fields: [
    {
      key: "networkId",
      label: "Network ID or subdomain",
      type: "string",
      required: true,
      hint: "The numeric Network id, or the subdomain (the `acme` in acme.mn.co). The token only " +
        "works for the Network it was generated in.",
      validation: { pattern: NETWORK_ID_PATTERN.source },
    },
    {
      key: "apiToken",
      label: "Admin API Token",
      type: "secret",
      required: true,
      hint: "Admin → Settings → API Keys → Generate New API Key. Shown only once.",
    },
  ],

  /** The only hook handed the raw token; it stamps the header and returns the request. */
  sign({ request, credential }) {
    const { apiToken } = credential as Partial<MightyCredential>;
    request.headers["authorization"] = `Bearer ${apiToken ?? ""}`;
    return request;
  },

  /**
   * `GET /networks/{id}/me` — the documented "information about the authenticated access token"
   * route and the quick start's own first call. It returns the token's user and Network, never the
   * token itself, and needs no scope beyond the key.
   *
   * Classified from the response BODY: a pass needs a JSON object that is the documented `me`
   * payload (`user`/`network`, or the quick start's flat `id`). A 200 carrying anything else (an
   * HTML shell, an `{error}` body) is not a pass, and a failure is reported with the vendor's own
   * `error`/`message` text — which is what tells "missing header" from "bad token" from "wrong
   * Network" — rather than a bare status code.
   */
  async test({ credential }, ctx) {
    const { networkId, apiToken } = credential as Partial<MightyCredential>;
    if (!networkId) return { ok: false, message: "credential missing networkId" };
    if (!NETWORK_ID_PATTERN.test(networkId)) {
      return {
        ok: false,
        message: "Network ID must be the numeric id or the subdomain (lowercase letters, digits, " +
          "hyphens)",
      };
    }
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_URL}/networks/${encodeURIComponent(networkId)}/me`, {
      // `test` runs before a Connection exists, so its request is not routed through `sign`.
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
    });
    const text = await res.text().catch(() => "");
    const detail = errorMessage(text);

    let body: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
    } catch {
      // Not JSON.
    }

    if (
      res.ok && body && !("error" in body) && ("user" in body || "network" in body || "id" in body)
    ) {
      return { ok: true };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Mighty Networks rejected the token${detail ? `: ${detail}` : ""}. Generate a ` +
          "new key under Admin → Settings → API Keys.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Mighty Networks refused the request${detail ? `: ${detail}` : ""}. The token ` +
          "may lack permission for this Network, or the Network's plan does not include the " +
          "Admin API (Scale, Growth or Mighty Pro).",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `Network "${networkId}" was not found${detail ? ` (${detail})` : ""}. Check the ` +
          "Network ID or subdomain.",
      };
    }
    if (res.ok) {
      return { ok: false, message: "Mighty Networks answered 200 with an unexpected body" };
    }
    return {
      ok: false,
      message: `Mighty Networks returned HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
    };
  },
};

export default apiToken;
