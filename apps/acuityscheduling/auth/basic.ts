import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * User ID + API Key (`basic`) — the recommended path for a single account.
 *
 * Acuity Scheduling authenticates every request with HTTP Basic Auth: the
 * account's numeric User ID as the username and its API Key as the password
 * — `Authorization: Basic base64("<userId>:<apiKey>")`. Both values are found
 * at Business Settings → Integrations → API
 * (secure.acuityscheduling.com/app.php?action=settings&key=api). Verified
 * 2026-08-01 against the official docs
 * (developers.acuityscheduling.com/reference/quick-start).
 *
 * `btoa` is used directly (not a hand-rolled UTF-8-safe encoder) because both
 * credential parts are vendor-issued ASCII (a numeric ID, an alphanumeric
 * key), so Latin1-only `btoa` cannot mis-encode them. For the "public
 * integrator" path (one Acuity OAuth app, many end users) see `./oauth2.ts`.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "User ID & API Key",
  description:
    "Business Settings → Integrations → API. Used as HTTP Basic username (User ID) and password (API Key).",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      row: "creds",
      hint: "Numeric account User ID — Business Settings → Integrations → API.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Business Settings → Integrations → API → API Key.",
    },
  ],

  sign({ request, credential }) {
    const { userId, apiKey } = credential as { userId: string; apiKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${userId}:${apiKey}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { userId, apiKey } = credential as { userId?: string; apiKey?: string };
    if (!userId || !apiKey) return { ok: false, message: "credential missing userId or apiKey" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Basic ${btoa(`${userId}:${apiKey}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Acuity Scheduling returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { name?: string; email?: string };
    return { user: { name: body.name, email: body.email } };
  },
};

export default basic;
