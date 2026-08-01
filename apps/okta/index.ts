/**
 * Okta — w6w port of n8n's `Okta` node, extended to groups and app links
 * against Okta's own REST API reference (https://developer.okta.com/docs/reference/api/).
 *
 * Covers the user and group resources: identity lifecycle (create, update,
 * deactivate, reactivate), group membership, and which apps a user can reach.
 *
 * The thing that shapes this app is that **every org has its own host** —
 * `dev-12345.okta.com`, or `*.oktapreview.com` for a sandbox. A static
 * manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares both wildcards. The runtime's egress
 *     matcher accepts any subdomain of either and still refuses everything
 *     else.
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     org, so it belongs to the Connection. `afterConnect` records it on the
 *     connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Deliberately absent: application lifecycle/management, policies, and the
 * event hooks/system log surface (a Trigger, not an Action) — none of those
 * are in n8n's Okta node, and none were re-verified against Okta's docs for
 * this pass.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDeactivate from "./actions/user-deactivate.ts";
import userReactivate from "./actions/user-reactivate.ts";
import userListApps from "./actions/user-list-apps.ts";

import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupAddUser from "./actions/group-add-user.ts";
import groupRemoveUser from "./actions/group-remove-user.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userList,
    userGet,
    userCreate,
    userUpdate,
    userDeactivate,
    userReactivate,
    userListApps,
    // group
    groupList,
    groupGet,
    groupAddUser,
    groupRemoveUser,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
