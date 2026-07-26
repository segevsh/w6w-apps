import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * Secret Key (`bearer`).
 *
 * Stripe's REST API authenticates with the account's secret key sent as a
 * bearer token (it also accepts HTTP Basic with the key as username; bearer is
 * the form Stripe's own docs lead with). Use a **restricted key** (`rk_…`)
 * scoped to just the resources a workflow needs rather than the account-wide
 * `sk_live_…` where you can.
 *
 * n8n's credential also collects a webhook `signatureSecret`. There is no
 * trigger surface in this port, so it is omitted rather than stored unused.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "Secret Key",
  description:
    "Paste a secret key (`sk_…`) or a restricted key (`rk_…`) from Stripe → Developers → API keys.",
  connectionLabel: "{{account.name}} ({{account.mode}})",
  fields: [
    {
      key: "secretKey",
      label: "Secret Key",
      type: "secret",
      required: true,
      hint:
        "Developers → API keys. Prefer a restricted key limited to the resources this workflow touches.",
    },
  ],

  sign({ request, credential }) {
    const { secretKey } = credential as { secretKey: string };
    request.headers["authorization"] = `Bearer ${secretKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { secretKey } = credential as { secretKey?: string };
    if (!secretKey) return { ok: false, message: "credential missing secretKey" };
    const res = await ctx.fetch(`${API_URL}/balance`, {
      headers: { authorization: `Bearer ${secretKey}`, "stripe-version": API_VERSION },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { ok: false, message: body.error?.message ?? `Stripe returned ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the connection with the account and, importantly, whether it is
   * live or test — the one thing you want visible before a workflow moves money.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account`);
    if (!res.ok) return {};
    const acct = await res.json().catch(() => ({})) as {
      id?: string;
      settings?: { dashboard?: { display_name?: string } };
      business_profile?: { name?: string };
      charges_enabled?: boolean;
    };
    const name = acct.settings?.dashboard?.display_name ?? acct.business_profile?.name ?? acct.id;
    return {
      account: {
        id: acct.id,
        name,
        mode: acct.id?.startsWith("acct_") && acct.charges_enabled ? "live" : "test",
      },
    };
  },
};

export default apiKey;
