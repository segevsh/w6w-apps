import type { ActionDefinition } from "@w6w/types";
import { FubClient } from "../lib/client.ts";

/**
 * `GET /identity` — who is this Connection, and which account is it in.
 *
 * ## Why this and not `/me`
 *
 * Follow Up Boss has two whoami endpoints, and only one of them is safe to
 * expose as an action.
 *
 * `GET /me` returns the authenticated user's own **`apiKey`** in the response
 * body, alongside `algoliaKey`, `callingCapabilityToken` and an
 * `intercomSettings.user_hash`. Shipping it as an action would hand any workflow
 * author a one-step credential dump: run the action, read `.apiKey`, and the
 * secret is now in a workflow variable, a log line, or an HTTP request to
 * somewhere else entirely. The sandbox's whole point is that a credential goes
 * on the wire in `sign` and is never visible to an action — an action that
 * *fetches* the credential back walks straight around that.
 *
 * So `/me` is not shipped, and this app never calls it anywhere, including in
 * the auth hooks. `GET /identity` answers the same practical question with none
 * of the secrets; its entire documented response is:
 *
 *     {"account": {"id": 1234567, "domain": "example",
 *                  "owner": {"name": "John Doe", "email": "j.doe@example.com"}},
 *      "user": {"id": 2, "name": "Louis Tully", "email": "louis@example.com"}}
 *
 * ## What it is useful for
 *
 * Two things beyond curiosity. First, `user.id` is the acting agent's id — the
 * value to use when a workflow should assign a task or deal to "whoever this
 * Connection is" rather than to a hard-coded person. Second, it is the natural
 * guard at the top of a workflow that must only run against one brokerage:
 * `account.domain` identifies the tenant, so a misconfigured Connection fails
 * fast instead of writing into the wrong account.
 *
 * It takes no parameters, needs no permission beyond existing, and is the same
 * call the auth `test` hook and the `quota` health check make.
 */
const getIdentity: ActionDefinition<Record<string, never>> = {
  key: "get-identity",
  type: "read",
  resource: "identity",
  title: "Get Identity",
  description:
    "Return the authenticated user and their Follow Up Boss account — ids, names, email and the " +
    "account domain. Use `user.id` to assign work to whoever this Connection is, or " +
    "`account.domain` to assert a workflow is pointed at the right brokerage.",
  params: [],
  output: [
    { key: "user", type: "object", label: "Authenticated user (id, name, email)" },
    { key: "account", type: "object", label: "Account (id, domain, owner)" },
  ],

  execute(_input, ctx) {
    return new FubClient(ctx).request("/identity");
  },
};

export default getIdentity;
