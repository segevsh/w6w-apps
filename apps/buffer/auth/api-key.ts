import type { AuthDefinition } from "@w6w/types";
import { ACCOUNT_LABEL_QUERY, accountLabel, IDENTITY_PROBE_QUERY, probe } from "../lib/identity.ts";

/**
 * Buffer personal API key — one bearer header, one Buffer account.
 *
 * ## Which credential, minted where
 *
 * Buffer's authentication guide is a four-step list and it has no ambiguity in
 * it: *"Log in to your Buffer account · Go to Settings → API · Create a new API
 * key · Copy the key"*, then *"Include your key in the Authorization header of
 * every request: `{"Authorization": "Bearer YOUR_TOKEN"}`"*, and *"Every
 * request to https://api.buffer.com must include this header. Requests without
 * a valid key will return a 401 Unauthorized error"*
 * (<https://developers.buffer.com/guides/authentication.html>, fetched
 * 2026-08-03). The settings page itself is
 * <https://publish.buffer.com/settings/api>.
 *
 * **This is the fact that makes the app buildable.** For most of the last
 * decade Buffer had stopped issuing developer credentials for its legacy REST
 * API, so a new integration had no route to one at all. The GraphQL API
 * reversed that: keys are self-serve on **every plan including Free** — the
 * rate-limit table lists "API Keys: 1" for Free, 3 for Essentials, 5 for Team.
 * Nothing here is gated behind an application, a review or a partner
 * agreement.
 *
 * ## Scope: the key is the account, not an organization
 *
 * Buffer is explicit, and it is the single most load-bearing sentence for how
 * this app is shaped:
 *
 *   > Your API key acts on behalf of your account only · It can access all
 *   > organizations and channels in your account · **There is no
 *   > per-organization scoping at this time** · The key is account-based, not
 *   > organization-based.
 *
 * So one Connection is one Buffer *account*, and it may span several
 * organizations. That is why nothing here narrows to an organization at connect
 * time and why almost every action takes an `organizationId` parameter instead:
 * scoping is a per-call decision, because the credential cannot express it.
 *
 * ## `test` — the smallest query that proves the key works
 *
 * `{ account { id } }`. One scalar, one level deep, so it costs about as little
 * as a Buffer query can (the complexity meter charges 1 point per scalar, 2 per
 * object, ×1.5 per level of nesting).
 *
 * **The probe was chosen by reading what comes back, not by the name.** The
 * `Account` type has ten fields and three of them are things a health probe has
 * no business fetching: `email` and `backupEmail` are the account holder's
 * addresses, and `connectedApps` enumerates every OAuth client the user has
 * authorised, with `clientId`, `name` and `website` for each. None of those is
 * a *secret* — a survey of the whole schema found no field anywhere that echoes
 * a token, key or password back to the caller, which is worth stating
 * positively because it is not the norm — but "not a secret" is a weaker
 * property than "not fetched", and a liveness probe needs nothing beyond an id.
 * `tests/index.test.ts` greps the source to keep it that way.
 *
 * ## The three ways this fails, and why they read differently
 *
 * Verified on the wire against `POST https://api.buffer.com`, 2026-08-03:
 *
 *   | `Authorization`             | HTTP | Body                                                                 |
 *   | --------------------------- | ---- | -------------------------------------------------------------------- |
 *   | *(absent)*                  | 401  | `{"errors":[{"message":"An authentication JWT or Access Token is required","extensions":{"code":"UNAUTHENTICATED"}}]}` |
 *   | `Bearer bogus_key_123`      | 401  | `{"errors":[{"message":"Access token is not valid","extensions":{"code":"UNAUTHENTICATED"}}]}` |
 *   | `Bearer bogus` + bad field  | 401  | identical — auth is checked **before** query validation                |
 *
 * Two things fall out, and both shape the code.
 *
 * **The observed code is `UNAUTHENTICATED`; the documented one is
 * `UNAUTHORIZED`.** Buffer's error-handling table lists `UNAUTHORIZED` against
 * "Missing or invalid API key". The live API does not use that spelling for
 * this case. Both are treated as credential failures (`CREDENTIAL_ERROR_CODES`
 * in `lib/client.ts`) rather than picking a winner, because one is what the
 * vendor published and the other is what the vendor serves.
 *
 * **Auth runs before validation.** A request with a bogus token *and* a
 * nonsense field returns the auth error, not a field error. That is why the
 * probe query can be trusted to report on the credential and nothing else.
 *
 * ## Why `test` cannot just look at `res.ok`
 *
 * Buffer states that *"GraphQL always returns HTTP 200. Check the response body
 * to determine success or failure."* That is not quite true of the auth path —
 * the transcript above shows a real 401 — but it is true enough elsewhere that
 * trusting the status line is the wrong instinct: a valid-but-`FORBIDDEN`
 * credential comes back 200 with an `errors` array. So the probe parses the
 * body through the same `parseGraphQLBody` the actions use, and a thrown error
 * is the failure signal. `lib/client.ts` documents all three failure arms.
 */

export interface BufferApiKeyCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built.
 *
 * Exported so `test`, `afterConnect` and the unit tests exercise the same code
 * path `sign` does. A hand-rolled second copy is how the `Bearer ` prefix goes
 * missing on a probe, and Buffer answers a scheme-less token with the same
 * "Access token is not valid" as a wrong one — a silent, indistinguishable
 * failure.
 */
export function authHeaders(
  credential: Partial<BufferApiKeyCredential>,
): Record<string, string> {
  return { Authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key at **Settings → API** in Buffer (<https://publish.buffer.com/settings/api>) " +
    "and paste it here. It is sent as `Authorization: Bearer <key>` and acts for your whole " +
    "Buffer account — every organization and channel on it. Available on all plans, Free " +
    "included.",
  connectionLabel: "{{account.name}}",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "Bearer ",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → API → create a key. Free accounts get 1 key, Essentials 3, Team 5. " +
        "Rotating the key in Buffer invalidates this Connection.",
    },
  ],

  /**
   * The only hook handed the raw key, and it runs network-less: it stamps the
   * header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<BufferApiKeyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<BufferApiKeyCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };
    return await probe(ctx, IDENTITY_PROBE_QUERY, authHeaders(cred));
  },

  /**
   * Labels the Connection with the account, and its organizations with it.
   *
   * A Buffer key is an opaque string with nothing readable in it, so the label
   * has to be fetched. `Account.name` is nullable, so it falls back to the
   * first organization's name and then to the id — a Connection with a blank
   * label is worse than one labelled by id.
   *
   * Returns `{}` rather than throwing on any failure: a missing label must
   * never block a Connection that authenticates. And it selects the same
   * PII-free field set the probe does, plus organization ids — which are the
   * one thing a user needs on hand for every subsequent action, so surfacing
   * them at connect time saves a call.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<BufferApiKeyCredential>;
    if (!cred?.apiKey) return {};
    return await accountLabel(ctx, ACCOUNT_LABEL_QUERY, authHeaders(cred));
  },
};

export default apiKey;
