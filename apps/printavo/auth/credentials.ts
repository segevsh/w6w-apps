import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Email + API token (`custom`).
 *
 * Printavo v2 authenticates with two static request headers, `email` and `token`
 * (token from My Account → API in the Printavo dashboard), so this is `custom`:
 * neither `Authorization` nor a bearer scheme is involved.
 *
 * The probe is `{ user { id name } }`, the session user — it needs no permission beyond
 * a valid credential and returns no secret. The verdict comes from the BODY: Printavo
 * answers a bad or missing credential with HTTP 200 and
 * `errors[0].extensions.code === 403` ("Unauthorized"), observed live 2026-10-06.
 */
const credentials: AuthDefinition = {
  key: "credentials",
  type: "custom",
  displayName: "Email and API Token",
  description: "Your Printavo login email and the API token from My Account in Printavo.",
  connectionLabel: "{{user.name}} ({{account.companyName}})",
  fields: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The email address of the Printavo user the token belongs to.",
    },
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Printavo → My Account → API Token.",
    },
  ],

  sign({ request, credential }) {
    const { email, token } = credential as { email: string; token: string };
    request.headers["email"] = email;
    request.headers["token"] = token;
    return request;
  },

  async test({ credential }, ctx) {
    const { email, token } = credential as { email?: string; token?: string };
    if (!email || !token) return { ok: false, message: "credential missing email or token" };
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { email, token, "content-type": "application/json" },
      body: JSON.stringify({ query: "{ user { id name } }" }),
    });
    const body = await res.json().catch(() => null) as {
      data?: { user?: { id?: string } | null } | null;
      errors?: Array<{ message?: string; extensions?: { code?: unknown } }>;
    } | null;
    if (!body) {
      return { ok: false, message: `Printavo returned HTTP ${res.status} with no JSON body` };
    }
    if (body.errors?.length) {
      const e = body.errors[0];
      const denied = String(e.extensions?.code) === "403" || /unauthorized/i.test(e.message ?? "");
      return {
        ok: false,
        message: denied ? "Printavo rejected the email/token (Unauthorized)" : e.message ??
          "Printavo returned an error",
      };
    }
    if (!body.data?.user?.id) return { ok: false, message: "credential did not resolve to a user" };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { email, token } = credential as { email?: string; token?: string };
    if (!email || !token) return {};
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { email, token, "content-type": "application/json" },
      body: JSON.stringify({ query: "{ user { id name account { id companyName } } }" }),
    });
    const body = await res.json().catch(() => ({})) as {
      data?: {
        user?: { id?: string; name?: string; account?: { id?: string; companyName?: string } };
      } | null;
    };
    const user = body.data?.user;
    if (!user) return {};
    return { user: { id: user.id, name: user.name }, account: user.account ?? {} };
  },
};

export default credentials;
