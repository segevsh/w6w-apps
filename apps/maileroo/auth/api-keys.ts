import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { ACCOUNT_BASE, ACCOUNT_HOST, SEND_BASE, SEND_HOST, vendorMessage } from "../lib/client.ts";

/**
 * Maileroo has two credential kinds, one per API host (Email API intro + Account API intro,
 * verified 2026-10-06):
 *
 * - **Sending key** → `smtp.maileroo.com` (Email API: send, send-template, send-bulk, scheduled
 *   emails). Created per domain (Domains > Sending Keys) or per application (Applications).
 *   Accepted as `X-Api-Key: <key>` or `Authorization: Bearer <key>`; this app sends `X-Api-Key`.
 * - **Account API key** → `api.maileroo.com` (Account API and OTP Verification). Sent as
 *   `Authorization: Bearer <key>`; carries granular scopes (account.read, domains.read,
 *   suppressions.write, verify.verifications.write, …) and an optional IP allowlist.
 *
 * One connection holds both (each optional), and `sign` picks by the request host. An action
 * that needs the key the connection does not hold fails with a message saying which one.
 *
 * ## Probes (never echo a credential)
 *
 * - Sending key: `GET /api/v2/emails/scheduled`, a read. A domain-scoped key answers a page;
 *   an application-scoped key answers `400 {success:false, message:"…must provide a linked
 *   domain."}` — which proves the key was accepted, so it is a pass. Only 401 / the vendor's
 *   "invalid API key" message is a rejection.
 * - Account key: `GET /v1/account` (identity + plan; no key in the body). A `403` whose message
 *   names a missing scope also proves the key is valid (a restricted key is a legitimate key);
 *   a 403 for the IP allowlist is a failure.
 */
export interface MailerooCredential {
  sendingKey?: string;
  accountKey?: string;
}

export const SEND_PROBE = `${SEND_BASE}/emails/scheduled`;
export const ACCOUNT_PROBE = `${ACCOUNT_BASE}/account`;

const clean = (v: unknown) => String(v ?? "").trim();

export function signHost(request: SignableRequest, credential: MailerooCredential) {
  const host = new URL(request.url).hostname;
  if (host === SEND_HOST) {
    const key = clean(credential.sendingKey);
    if (!key) {
      throw new Error(
        "This action calls the Maileroo Email API and needs the connection's Sending Key " +
          "(Domains > Sending Keys, or an Application). Add it to the connection.",
      );
    }
    request.headers["x-api-key"] = key;
  } else if (host === ACCOUNT_HOST) {
    const key = clean(credential.accountKey);
    if (!key) {
      throw new Error(
        "This action calls the Maileroo Account API and needs the connection's Account API Key " +
          "(Account > API Keys). Add it to the connection.",
      );
    }
    request.headers["authorization"] = `Bearer ${key}`;
  }
  return request;
}

async function probe(
  ctx: Parameters<NonNullable<AuthDefinition["test"]>>[1],
  url: string,
  credential: MailerooCredential,
) {
  const request: SignableRequest = { url, method: "GET", headers: { accept: "application/json" } };
  signHost(request, credential);
  const res = await ctx.fetch(request.url, { method: "GET", headers: request.headers });
  const raw = await res.text().catch(() => "");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch { /* not JSON */ }
  return { res, message: vendorMessage(body) ?? "" };
}

const apiKeys: AuthDefinition = {
  key: "api-keys",
  type: "apiKey",
  displayName: "API Keys",
  description: "Maileroo uses a Sending Key for the Email API (sending) and an Account API Key " +
    "for the Account and OTP Verification APIs. Provide the one(s) your workflow needs.",
  connectionLabel: "Maileroo",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "sendingKey",
      label: "Sending Key",
      type: "secret",
      hint:
        "Email API: send-email, send-templated-email, send-bulk-emails and the scheduled-email " +
        "actions. Domains > (domain) > Sending Keys, or Applications.",
    },
    {
      key: "accountKey",
      label: "Account API Key",
      type: "secret",
      hint: "Account API and OTP Verification: account, statistics, logs, domains, suppressions, " +
        "templates, applications and verification actions. Needs the matching scopes.",
    },
  ],

  sign({ request, credential }) {
    return signHost(request, credential as MailerooCredential);
  },

  async test({ credential }, ctx) {
    const cred = credential as MailerooCredential;
    if (!clean(cred.sendingKey) && !clean(cred.accountKey)) {
      return { ok: false, message: "provide a Sending Key, an Account API Key, or both" };
    }
    const notes: string[] = [];

    if (clean(cred.sendingKey)) {
      const { res, message } = await probe(ctx, SEND_PROBE, cred);
      if (res.status === 401 || /invalid api key/i.test(message)) {
        return { ok: false, message: "Maileroo rejected the Sending Key (invalid API key)" };
      }
      if (res.status === 429) return { ok: false, message: "Maileroo rate-limited the key check" };
      if (res.status >= 500) {
        return { ok: false, message: `Maileroo Email API answered HTTP ${res.status}` };
      }
      if (!res.ok && res.status !== 400) {
        return { ok: false, message: `Maileroo Email API answered HTTP ${res.status}: ${message}` };
      }
      notes.push("sending key accepted");
    }

    if (clean(cred.accountKey)) {
      const { res, message } = await probe(ctx, ACCOUNT_PROBE, cred);
      if (res.status === 401) {
        return {
          ok: false,
          message: "Maileroo rejected the Account API Key (invalid, revoked or missing)",
        };
      }
      if (res.status === 403 && /ip address/i.test(message)) {
        return {
          ok: false,
          message: "The Account API Key's IP allowlist does not include this host",
        };
      }
      if (res.status === 429) return { ok: false, message: "Maileroo rate-limited the key check" };
      if (res.status >= 500) {
        return { ok: false, message: `Maileroo Account API answered HTTP ${res.status}` };
      }
      if (!res.ok && res.status !== 403) {
        return {
          ok: false,
          message: `Maileroo Account API answered HTTP ${res.status}: ${message}`,
        };
      }
      if (res.status === 403) notes.push("account key accepted but lacks the account.read scope");
      else notes.push("account key accepted");
    }
    return { ok: true, message: notes.join("; ") };
  },
};

export default apiKeys;
