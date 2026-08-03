import type { AuthDefinition } from "@w6w/types";
import { API_V3, formatError, type MailjetErrorBody } from "../lib/client.ts";

/**
 * API Key + Secret Key (`basic`) — the only scheme Mailjet's Email API accepts.
 *
 * Confirmed **on the wire**, not merely from documentation. An unauthenticated
 * request to any v3 resource answers with the challenge itself:
 *
 *     $ curl -sSI https://api.mailjet.com/v3/REST/apikey
 *     HTTP/2 401
 *     www-authenticate: Basic realm="Provide an apiKey and secretKey"
 *
 * — checked 2026-08-03. The API overview says the same in prose: "All Email API
 * endpoints requests are authenticated using HTTPS Basic Auth... The username is
 * your API Key and the password is your API Secret Key."
 *
 * Both halves are minted together when the account is created and are visible at
 * <https://app.mailjet.com/account/apikeys>. The same pair doubles as the SMTP
 * relay's login and password, which is why the secret is a genuine password and
 * is typed `secret` here even though Mailjet's UI shows it alongside a
 * non-secret-looking key.
 *
 * ## Why there is no `afterConnect`, and no `connectionLabel`
 *
 * This is a deliberate omission with a security reason, not an oversight.
 *
 * The obvious way to label a Mailjet connection would be to read the account's
 * own name from `GET /v3/REST/apikey`. That endpoint's response body is
 * documented (`api-documentation/guides/_account-management.md`) as:
 *
 *     { "Count": 1, "Data": [ { "ACL", "APIKey", "CreatedAt", "ID",
 *       "IsActive", "IsMaster", "Name", "QuarantineValue", "Runlevel",
 *       "SecretKey", "TrackHost", "UserID" } ], "Total": 1 }
 *
 * It returns **`APIKey` and `SecretKey` in plaintext**. `afterConnect`'s return
 * value becomes the Connection's display metadata — stored, rendered in the UI,
 * and readable by every action. Calling that endpoint to harvest a label would
 * pipe the credential straight out of the one hook allowed to hold it. So this
 * app never calls `/v3/REST/apikey` at all, from any hook, and a Mailjet
 * connection is left unlabelled rather than labelled at that price.
 *
 * Mailjet documents no other account-identity read. `dev.mailjet.com`'s
 * `/email/reference/settings/` page 404s as of 2026-08-03, so there is nothing
 * verified to substitute; inventing a `/myprofile` or `/user` path from memory
 * would be exactly the guess this app is meant not to make.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Key & Secret Key",
  description:
    "Both keys from app.mailjet.com → Account Settings → API Key Management. Sent as HTTP Basic " +
    "username and password.",
  fields: [
    {
      // `secret`, not `string`, even though Mailjet calls this the *public* half
      // and shows it unmasked in their own UI. Basic auth has no notion of a
      // public username: `base64(apiKey:secretKey)` is one credential, and half
      // of it is still credential material. The pack's auditor enforces the same
      // rule for any field named like a credential.
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "app.mailjet.com → Account Settings → API Key Management → API Key (the public half).",
    },
    {
      key: "secretKey",
      label: "Secret Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The Secret Key shown beside it. Also your SMTP relay password — treat it as one.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, secretKey } = credential as { apiKey: string; secretKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:${secretKey}`)}`;
    return request;
  },

  /**
   * `GET /v3/REST/contactslist?Limit=1` — one row, the cheapest read this
   * credential is guaranteed to be entitled to.
   *
   * Picked over the two more obvious candidates on purpose:
   *
   *   - `/v3/REST/apikey` is a real whoami, and is what the (stale) integration
   *     catalogue link pointed at — but see the note above: it hands back
   *     `SecretKey`. Not worth touching even in a hook that already holds the
   *     credential, because a 200 here would tempt a future `afterConnect`.
   *   - `/v3/REST/sender` is comparably cheap but is empty on a fresh account
   *     until a sender is validated, so it reads as "working" and "unconfigured"
   *     identically — fine, but no better.
   *
   * `contactslist` is entitlement-free in a way that matters for Mailjet
   * specifically: sub-accounts are a first-class feature, and per Mailjet's own
   * account-management guide "Each API key will have its own dedicated database
   * for contacts, lists, newsletters and statistics." Every key — master or sub
   * — therefore has a contacts database it can read. A probe that only the master
   * key could satisfy would report a perfectly good sub-account key as broken.
   *
   * `Limit=1` keeps it to a single row regardless of account size.
   */
  async test({ credential }, ctx) {
    const { apiKey, secretKey } = credential as { apiKey?: string; secretKey?: string };
    if (!apiKey || !secretKey) {
      return { ok: false, message: "credential missing apiKey or secretKey" };
    }
    const res = await ctx.fetch(`${API_V3}/contactslist?Limit=1`, {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
      },
    });
    if (res.ok) return { ok: true };

    // Mailjet answers a bare 401 with `content-type: text/html` (the Basic
    // challenge), so parsing is best-effort and the message never quotes the
    // request.
    const body = await res.json().catch(() => null) as MailjetErrorBody | null;
    return { ok: false, message: `Mailjet returned ${formatError(res.status, body ?? undefined)}` };
  },
};

export default basic;
