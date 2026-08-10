import type { ActionDefinition } from "@w6w/types";
import { AttioClient } from "../lib/client.ts";

/**
 * `GET /v2/self` — which workspace am I in, and what am I allowed to do?
 *
 * "Identify the current access token, the workspace it is linked to, and any
 * permissions it has."
 *
 * ## Two reasons this exists as an action and not only as a hook
 *
 *  1. **Scope introspection.** The `scope` claim is a space-separated list of
 *     what the token was actually granted. A workflow that is about to write
 *     tasks can check for `task:read-write` and branch, instead of discovering
 *     the gap as a 403 halfway through a batch. Nothing else in the API reports
 *     this.
 *  2. **Workspace identification.** `workspace_id`, `workspace_name` and
 *     `workspace_slug` answer "which Attio am I talking to" — the thing you want
 *     logged at the top of a run that could be pointed at staging.
 *
 * ## It returns HTTP 200 when the token is BAD. Handled here.
 *
 * This is an RFC 7662-style introspection endpoint, so "that token is invalid"
 * is a successful answer, not an error. The spec models the 200 response as an
 * `anyOf` whose first arm is the bare object `{"active": false}`, and the live
 * server does exactly that — probed 2026-08-03 with a 64-character random token:
 *
 *     GET /v2/self  ->  HTTP/2 200  {"active":false}
 *
 * A caller that trusted the status code would read that as success. This action
 * therefore returns `active` as its first output, and throws on the inactive
 * arm so a workflow step fails where it should rather than continuing with an
 * empty scope list. The same check, for the same reason, is in
 * `auth/api-key.ts`'s `test` hook.
 *
 * ## Nothing here is a secret — checked before shipping it
 *
 * The obvious worry with any "identify me" endpoint is that it hands the
 * credential back (Follow Up Boss's `/me` returns the caller's own API key;
 * Mailjet's `/v3/REST/apikey` returns key and secret). Attio's does not. The
 * active-token response schema is fifteen properties — `active`, `scope`,
 * `client_id`, `token_type`, `exp`, `iat`, `sub`, `aud`, `iss`,
 * `authorized_by_workspace_member_id`, `workspace_id`, `workspace_name`,
 * `workspace_slug`, `workspace_logo_url` — every one of them a claim *about* the
 * token. The token itself is not among them, and `tests/index.test.ts` greps the
 * app to keep it that way.
 */
const getIdentity: ActionDefinition<Record<string, never>> = {
  key: "get-identity",
  type: "read",
  resource: "identity",
  title: "Get Identity",
  description:
    "Identify the connected token: which workspace it belongs to and exactly which scopes it was " +
    "granted. Use it to check a permission before a write rather than discovering the gap as a " +
    "403. Fails loudly if Attio reports the token as inactive — which it does with HTTP 200.",
  params: [],
  output: [
    { key: "active", type: "boolean", label: "Whether Attio considers the token usable" },
    { key: "scopes", type: "array", label: "Granted scopes, split out of the `scope` claim" },
    { key: "workspace_id", type: "string", label: "Workspace UUID" },
    { key: "workspace_name", type: "string", label: "Workspace name" },
    { key: "workspace_slug", type: "string", label: "Workspace slug" },
    { key: "authorized_by_workspace_member_id", type: "string", label: "Who authorised the token" },
    { key: "expires_at", type: "number", label: "Expiry as a Unix timestamp, or null if none" },
  ],

  async execute(_input, ctx) {
    const self = await new AttioClient(ctx).request<{
      active?: boolean;
      scope?: string;
      exp?: number | null;
      workspace_id?: string;
      workspace_name?: string;
      workspace_slug?: string;
      authorized_by_workspace_member_id?: string;
    }>("/self");

    // The 200-that-means-failure. Throwing is the honest outcome: every other
    // field is absent on this arm, so returning it would hand the next step a
    // record of nulls that looks like a healthy answer.
    if (self?.active !== true) {
      throw new Error(
        "Attio reports this access token as inactive (`GET /v2/self` answered HTTP 200 with " +
          '`{"active": false}`). The token has most likely been revoked, or its workspace was ' +
          "deleted. Reconnect with a fresh token.",
      );
    }

    return {
      active: true,
      scopes: (self.scope ?? "").split(/\s+/).filter((s) => s.length > 0),
      workspace_id: self.workspace_id,
      workspace_name: self.workspace_name,
      workspace_slug: self.workspace_slug,
      authorized_by_workspace_member_id: self.authorized_by_workspace_member_id,
      expires_at: self.exp ?? null,
    };
  },
};

export default getIdentity;
