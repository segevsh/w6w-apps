import type { AuthDefinition } from "@w6w/types";
import { API, describeError } from "../lib/client.ts";

/**
 * An API access token — `tskey-api-…`, created on the Keys page of the admin
 * console.
 *
 * ## It is a person's token, and it expires
 *
 * The token carries the permissions of the user who created it, so what this
 * connection can do is whatever that person can do — and when their role
 * changes or they leave, so does the connection.
 *
 * It also **expires in 1 to 90 days**, chosen at creation, and there is no
 * refresh: a new token has to be made by hand. Nothing warns beforehand, and
 * the failure is a 401 with a message that does not mention expiry. That is
 * the single commonest way an automation against Tailscale stops working, and
 * it is why `oauth-client` is the better choice for anything long-lived.
 *
 * ## Basic or Bearer, and Tailscale accepts either
 *
 * The documented form is HTTP Basic with the token as the *username* and an
 * empty password. `Authorization: Bearer <token>` is equally supported and is
 * what this uses — same result, and no base64 in the hook.
 */
const auth: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API access token",
  connectionLabel: "{{tailnet}} — {{credentialKind}}",
  description:
    "A `tskey-api-…` token from the admin console. It carries the permissions of the USER who " +
    "made it and EXPIRES after 1 to 90 days with no refresh and no warning — for anything " +
    "long-lived, use an OAuth client instead.",
  fields: [
    {
      key: "token",
      label: "API access token",
      type: "secret",
      required: true,
      hint: "Starts with `tskey-api-`. Admin console → Settings → Keys → Generate access token. " +
        "Note the expiry you choose there: this connection stops working on that date.",
    },
    {
      key: "tailnet",
      label: "Tailnet",
      type: "string",
      default: "-",
      advanced: true,
      hint: "`-` means the calling credential's own tailnet, which is right for almost " +
        "everybody. A tailnet id like `T1234CNTRL` is only needed for a credential with access " +
        "to several.",
    },
  ],

  sign({ request, credential }) {
    const token = String((credential as Record<string, unknown>)?.token ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${token}` },
    };
  },

  async test({ credential }, ctx) {
    const tailnet = String((credential as Record<string, unknown>)?.tailnet ?? "-") || "-";
    let res: Response;
    try {
      res = await ctx.fetch(`${API}/tailnet/${encodeURIComponent(tailnet)}/devices`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach the Tailscale API: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: describeError(res.status, text, res.headers.get("x-tailscale-request-id")),
      };
    }

    let devices: unknown[] = [];
    try {
      devices = (JSON.parse(text) as { devices?: unknown[] })?.devices ?? [];
    } catch { /* an empty tailnet is still a working credential */ }

    return {
      ok: true,
      message: `reached tailnet ${tailnet === "-" ? "(the token's own)" : tailnet} — ` +
        `${devices.length} device${devices.length === 1 ? "" : "s"}. This token carries the ` +
        "permissions of the user who created it, and stops working on its expiry date",
    };
  },

  afterConnect({ credential }) {
    const fields = credential as Record<string, unknown>;
    return {
      tailnet: String(fields?.tailnet ?? "-") || "-",
      credentialKind: "API access token",
    };
  },
};

export default auth;
