/**
 * Clerk — manage a Clerk instance from a workflow: users, organizations, memberships,
 * invitations, sessions, and sign-in tokens, through the Backend API.
 *
 * Verified against Clerk's own machine-readable OpenAPI spec —
 * [`clerk/openapi-specs`](https://github.com/clerk/openapi-specs), `bapi/2026-05-12.yml` — and
 * against live, unauthenticated probes of `api.clerk.com` and `status.clerk.com`, both on
 * 2026-09-15. No third-party integration directory was used.
 *
 * ## One host, and the credential decides everything
 *
 * Every Clerk instance is reached at the same `https://api.clerk.com/v1` — unlike a platform that
 * keys an integration off a per-tenant subdomain (Auth0's `{tenant}.{region}.auth0.com`), the
 * Secret Key alone says which instance a call lands on. There is no domain to collect, normalise,
 * or get wrong.
 *
 * ## Two documented breaking changes that would cost someone a debugging session
 *
 * 1. **Metadata moved behind its own endpoint.** As of Backend API version 2026-05-12,
 *    `PATCH /users/{id}` and `PATCH /organizations/{id}` both have `additionalProperties: false`
 *    and no longer list `public_metadata` / `private_metadata` / `unsafe_metadata` among their
 *    properties — Clerk rejects them there now. Merging metadata is
 *    `PATCH /{resource}/{id}/metadata` (deep merge; set a key to `null` to delete it); a `PUT`
 *    variant replaces a field wholesale but isn't exposed here, since it is a much easier way to
 *    lose sibling keys than the merge form is to misuse. `user-update-metadata` and
 *    `organization-update-metadata` are the merge-only actions.
 * 2. **List responses are not consistently shaped.** `GET /users`, `GET /sessions` and
 *    `GET /invitations` each answer a bare JSON array. `GET /organizations`,
 *    `GET /organizations/{id}/memberships`, `GET /organizations/{id}/invitations` and
 *    `GET /organization_roles` each answer `{ data: [...], total_count }`. Nothing in the URL
 *    signals which — only the response schema does, and it differs endpoint to endpoint. This
 *    app normalises every list action's *output* to `{ data, totalCount? }` (see
 *    [`lib/client.ts`](lib/client.ts)) so a workflow reading this app never has to know which
 *    underlying shape backed a given action.
 *
 * ## Two ways to get someone into an organization, and they are not interchangeable
 *
 * `organization-membership-create` adds an EXISTING user immediately, given their user ID.
 * `organization-invitation-create` emails an address that may not have a Clerk account at all,
 * and only becomes a membership once they accept it — new invitations sit "pending" until then.
 *
 * ## Revoking is not the same as blocking
 *
 *   - `invitation-revoke` invalidates the invitation LINK, but Clerk's own docs are explicit that
 *     it "doesn't prevent the user from signing up if they follow the sign up flow" directly — it
 *     is a courtesy, not an access control.
 *   - `user-delete` frees the user's email/phone for a brand-new signup and does not revoke
 *     already-issued tokens; `user-ban` revokes every active session and blocks sign-in, and is
 *     reversible. Both destructive actions (`user-delete`, `organization-delete`) require an
 *     explicit `confirm` flag.
 *
 * ## Sign-in tokens over session creation
 *
 * `POST /sessions` (create a session directly) exists in Clerk's spec but its own description
 * says it is "intended only for use in testing, and is not available for production instances,"
 * pointing instead at Sign-in Tokens for a backend-issued session — so this app exposes
 * `sign-in-token-create`/`sign-in-token-revoke` and does not expose session creation at all.
 *
 * Deliberately out of scope: the Frontend API and any client-side sign-in/sign-up flow; JWT
 * templates and OAuth application configuration; SAML/enterprise-SSO and SCIM directory sync;
 * billing; and instance-settings endpoints (domains, restrictions, redirect URLs) — all of these
 * are instance configuration, not workflow-shaped operations on the resources above.
 */
import type { AppDefinition } from "@w6w/types";
import secretKey from "./auth/secret-key.ts";

import userList from "./actions/user-list.ts";
import userCount from "./actions/user-count.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userUpdateMetadata from "./actions/user-update-metadata.ts";
import userDelete from "./actions/user-delete.ts";
import userBan from "./actions/user-ban.ts";
import userUnban from "./actions/user-unban.ts";

import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";
import organizationCreate from "./actions/organization-create.ts";
import organizationUpdate from "./actions/organization-update.ts";
import organizationUpdateMetadata from "./actions/organization-update-metadata.ts";
import organizationDelete from "./actions/organization-delete.ts";
import organizationRoleList from "./actions/organization-role-list.ts";

import organizationMembershipCreate from "./actions/organization-membership-create.ts";
import organizationMembershipList from "./actions/organization-membership-list.ts";
import organizationMembershipRemove from "./actions/organization-membership-remove.ts";

import organizationInvitationCreate from "./actions/organization-invitation-create.ts";
import organizationInvitationList from "./actions/organization-invitation-list.ts";
import organizationInvitationRevoke from "./actions/organization-invitation-revoke.ts";

import sessionList from "./actions/session-list.ts";
import sessionGet from "./actions/session-get.ts";
import sessionRevoke from "./actions/session-revoke.ts";

import invitationCreate from "./actions/invitation-create.ts";
import invitationList from "./actions/invitation-list.ts";
import invitationRevoke from "./actions/invitation-revoke.ts";

import signInTokenCreate from "./actions/sign-in-token-create.ts";
import signInTokenRevoke from "./actions/sign-in-token-revoke.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";

export default {
  actions: [
    // users
    userGet,
    userList,
    userCount,
    userCreate,
    userUpdate,
    userUpdateMetadata,
    userDelete,
    userBan,
    userUnban,
    // organizations
    organizationGet,
    organizationList,
    organizationCreate,
    organizationUpdate,
    organizationUpdateMetadata,
    organizationDelete,
    organizationRoleList,
    // organization membership
    organizationMembershipCreate,
    organizationMembershipList,
    organizationMembershipRemove,
    // organization invitations
    organizationInvitationCreate,
    organizationInvitationList,
    organizationInvitationRevoke,
    // sessions
    sessionGet,
    sessionList,
    sessionRevoke,
    // application invitations
    invitationCreate,
    invitationList,
    invitationRevoke,
    // sign-in tokens
    signInTokenCreate,
    signInTokenRevoke,
  ],
  auth: [secretKey],
  healthChecks: [service, instance],
} satisfies AppDefinition;
