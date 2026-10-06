import type { AuthDefinition } from "@w6w/types";
import { apiBase, normalizeSubdomain } from "../lib/client.ts";

export interface ZulipCredential {
  subdomain: string;
  email: string;
  apiKey: string;
}

/**
 * The one place the wire format is built, shared by `sign` and `test` so the probe sends
 * exactly what real requests send. Zulip: HTTP Basic with the user's (or bot's) Zulip API
 * email as the username and the API key as the password (zulip.com/api/http-headers).
 */
export function basicHeader(credential: Partial<ZulipCredential>): string {
  return `Basic ${btoa(`${credential.email ?? ""}:${credential.apiKey ?? ""}`)}`;
}

/**
 * Turn a probe response into a verdict, from the body rather than the status.
 *
 * Measured 2026-10-06: an unknown org subdomain answers 400 `{"msg":"Invalid subdomain",
 * "code":"BAD_REQUEST"}` on `/server_settings`, while a missing or wrong credential on a real
 * org answers 401 `{"code":"UNAUTHORIZED"}` (older servers: 403) — so the same request can fail
 * for two different reasons and the `msg` is what tells them apart.
 */
export function classifyProbe(
  status: number,
  body: { result?: string; msg?: string; code?: string; user_id?: unknown } | null,
): { ok: boolean; message?: string } {
  if (status === 200 && body?.result === "success" && typeof body.user_id === "number") {
    return { ok: true };
  }
  if (status === 200) {
    return { ok: false, message: "unexpected 200 body from GET /users/me — not a Zulip profile" };
  }
  if (status === 429 || body?.code === "RATE_LIMIT_HIT") {
    return {
      ok: false,
      message: "Zulip rate-limited the check (429); this says nothing about the key.",
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      message: `Zulip is erroring (${status}); this is not a verdict on the key.`,
    };
  }
  const detail = body?.msg ? `: ${body.msg}` : "";
  if (/subdomain/i.test(body?.msg ?? "")) {
    return { ok: false, message: `No Zulip Cloud organization at that subdomain${detail}` };
  }
  if (status === 401 || status === 403 || body?.code === "UNAUTHORIZED") {
    return { ok: false, message: `Zulip rejected the email / API key (${status})${detail}` };
  }
  return { ok: false, message: `Zulip returned an unexpected ${status}${detail}` };
}

/**
 * Basic auth — the Zulip organization's subdomain, the Zulip API email (a user's, or a bot's
 * `…-bot@<org>.zulipchat.com`) and that account's API key. A bot's key is under Settings →
 * Personal settings → Bots; a user's is under Settings → Account & privacy → Manage your API key.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Email & API key",
  description:
    "Use a bot's (or your own) Zulip API email and API key. Bots: Settings → Personal settings → Bots. Users: Settings → Account & privacy → Manage your API key. Zulip Cloud organizations only (<org>.zulipchat.com).",
  connectionLabel: "{{email}} @ {{subdomain}}",
  fields: [
    {
      key: "subdomain",
      label: "Organization subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The `acme` in `acme.zulipchat.com`. A full URL is accepted and trimmed.",
    },
    {
      key: "email",
      label: "Zulip API email",
      type: "string",
      required: true,
      row: "creds",
      hint:
        "The bot's or user's email as shown under its API key (a bot's looks like `my-bot@acme.zulipchat.com`), not necessarily the delivery email.",
    },
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      row: "creds",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<ZulipCredential>);
    return request;
  },

  /**
   * Probe: `GET /users/me` — reachable by every role including guests and bots, and its
   * documented response is the caller's profile, which does not contain the API key.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ZulipCredential>;
    const subdomain = normalizeSubdomain(cred?.subdomain);
    const email = (cred?.email ?? "").trim();
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!subdomain) {
      return { ok: false, message: "credential has no valid organization subdomain" };
    }
    if (!email || !apiKey) return { ok: false, message: "credential missing email or apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${apiBase(subdomain)}/users/me`, {
        headers: { accept: "application/json", authorization: basicHeader({ email, apiKey }) },
      });
    } catch (e) {
      return { ok: false, message: `could not reach ${subdomain}.zulipchat.com: ${e}` };
    }
    const body = await res.json().catch(() => null);
    return classifyProbe(res.status, body);
  },

  /**
   * Republish the non-secret parts (subdomain, API email) so action code can build URLs and the
   * connection label can render without the credential.
   */
  afterConnect({ credential }) {
    const { subdomain, email } = credential as { subdomain?: string; email?: string };
    return { subdomain: normalizeSubdomain(subdomain), email: email?.trim() };
  },
};

export default basic;
