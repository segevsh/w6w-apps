import type { HookContext } from "@w6w/types";
import { API_URL, isCredentialError, parseGraphQLBody } from "./client.ts";

/**
 * The identity probe shared by both auth methods.
 *
 * Two auth methods (`api-key`, `oauth2`) need the same two calls — "is this
 * credential live?" and "what should the Connection be called?" — and they
 * differ only in whether the caller stamps the `Authorization` header itself.
 * The API key method does (its `test` is deliberately not routed through
 * `sign`); the OAuth method does not, because the runtime signs `ctx.fetch` for
 * an `oauth2` connection.
 *
 * So both queries and both interpreters live here once, and each auth file
 * passes the headers it has — `{}` for OAuth. Two hand-written copies is how
 * one of them ends up selecting a field the other deliberately avoids.
 *
 * ## Why these two queries and not richer ones
 *
 * `IDENTITY_PROBE_QUERY` is `{ account { id } }` — one scalar. It proves the
 * credential resolves to an account and reads nothing else. The `Account` type
 * also exposes `email`, `backupEmail` and `connectedApps` (every OAuth client
 * the user has authorised, with its `clientId`); a liveness probe has no use
 * for any of it. See `auth/api-key.ts` for the full reasoning, and
 * `tests/index.test.ts` for the grep that keeps those fields out.
 *
 * `ACCOUNT_LABEL_QUERY` adds `name` and the organizations' `id`/`name`, which
 * are what a human recognises a Connection by and what every action needs as
 * input. Still no email.
 */

/** `{ account { id } }` — the smallest query that proves a credential works. */
export const IDENTITY_PROBE_QUERY = `query W6wIdentityProbe { account { id } }`;

/** Adds just enough to name the Connection and hand over the organization ids. */
export const ACCOUNT_LABEL_QUERY =
  `query W6wAccountLabel { account { id name organizations { id name } } }`;

export interface AccountLabelData {
  account?: {
    id?: string;
    name?: string | null;
    organizations?: Array<{ id?: string; name?: string }> | null;
  } | null;
}

/**
 * Run a probe query and map it onto an `AuthDefinition.test` result.
 *
 * `parseGraphQLBody` throws on all three of Buffer's failure arms (non-2xx, a
 * 200 with `errors`, an unreadable body), so the whole classification is in the
 * catch. The error text is Buffer's own message plus its `extensions.code`,
 * which is what makes the three outcomes below distinguishable at all — they
 * need three different fixes:
 *
 *   - `UNAUTHENTICATED` / `UNAUTHORIZED` → the key is wrong, revoked or rotated.
 *   - `FORBIDDEN` → the credential is real but not allowed this. On an OAuth
 *     connection that usually means a missing scope, which is a re-consent, not
 *     a new key.
 *   - anything else → Buffer's problem, not the credential's, and saying "auth
 *     failed" would send someone hunting in the wrong place.
 *
 * Nothing from `credential` is ever placed in a returned message; the only text
 * that escapes is Buffer's.
 */
export async function probe(
  ctx: HookContext,
  query: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; message?: string }> {
  let res: Response;
  try {
    res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    return { ok: false, message: `could not reach Buffer: ${messageOf(e)}` };
  }

  const text = await res.text().catch(() => "");
  const code = extractCode(text);

  try {
    parseGraphQLBody<AccountLabelData>(res.status, text);
  } catch (e) {
    if (isCredentialError(code)) {
      return {
        ok: false,
        message: `Buffer rejected the credential (${code}): ${messageOf(e)}. Check the key at ` +
          "Settings → API, or reconnect if it was rotated.",
      };
    }
    if (code === "FORBIDDEN") {
      return {
        ok: false,
        message: `Buffer returned FORBIDDEN: ${messageOf(e)}. The credential is valid but not ` +
          "permitted here — on an OAuth connection this is usually a missing scope.",
      };
    }
    return { ok: false, message: messageOf(e) };
  }

  return { ok: true };
}

/**
 * Fetch the Connection label.
 *
 * Never throws and never blocks a Connection: every failure path returns `{}`,
 * and the host falls back to its own default label.
 */
export async function accountLabel(
  ctx: HookContext,
  query: string,
  headers: Record<string, string>,
): Promise<Record<string, unknown>> {
  let data: AccountLabelData;
  try {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify({ query }),
    });
    data = parseGraphQLBody<AccountLabelData>(res.status, await res.text());
  } catch {
    return {};
  }

  const account = data?.account;
  if (!account?.id) return {};

  const organizations = (account.organizations ?? [])
    .filter((o) => o?.id)
    .map((o) => ({ id: o.id, name: o.name }));

  return {
    account: {
      id: account.id,
      // `Account.name` is nullable, so fall through rather than label a
      // Connection with an empty string.
      name: account.name || organizations[0]?.name || `Buffer account ${account.id}`,
      organizations,
    },
  };
}

/**
 * Pull `extensions.code` out of a raw response body.
 *
 * Read from the text rather than from the thrown error so the classification
 * does not depend on how `formatGraphQLErrors` happens to phrase things.
 */
export function extractCode(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as {
      errors?: Array<{ extensions?: { code?: string } }>;
    };
    return body?.errors?.[0]?.extensions?.code;
  } catch {
    return undefined;
  }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
