import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Webflow Site API token (`bearer`). Generate one under a site's
 * Settings → Apps & integrations → API access, and paste it here. Every request
 * signs with `Authorization: Bearer <token>`. The token is scoped to the single
 * site it was minted from and carries whatever scopes were granted at creation.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste a site API token from Webflow → Site settings → Apps & integrations → API access.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Site settings → Apps & integrations → API access → Generate API token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const res = await ctx.fetch(`${API_URL}/sites`, {
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Webflow returned ${res.status}` };
    return { ok: true };
  },
};

export default apiToken;
