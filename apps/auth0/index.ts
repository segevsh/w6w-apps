/**
 * Auth0 — manage a tenant from a workflow: users, roles, organizations,
 * connections, applications and the tenant log, through the Management API v2.
 *
 * Auth0 publishes no fetchable OpenAPI document, so paths came from its
 * reference documentation and every one this app calls was verified to route
 * against a live Auth0 domain on 2026-08-18 — each answering `401
 * {"statusCode":401,"error":"Unauthorized","message":"Missing authentication"}`
 * rather than a 404.
 *
 * ## Two silent limits on reading users, both Auth0's own documented behaviour
 *
 * 1. **`GET /users` is eventually consistent.** Auth0: *"The Management API's
 *    List or Search Users endpoint (`GET /users`) is eventually consistent, so
 *    results may not immediately reflect recently-completed write
 *    operations."* A workflow that creates a user and then searches for it can
 *    legitimately not find it, and will conclude the create failed.
 * 2. **Search returns at most 1,000 users**, *"even if more users match your
 *    query"* — with no error and no flag.
 *
 * `user-get` and `user-get-by-email` are the immediately-consistent
 * alternatives, and this app points at them wherever it matters. `user-list`
 * always asks for totals so it can at least *tell* the caller when the ceiling
 * was hit, which Auth0 will not.
 *
 * ## The tenant is the host, and the audience is the trap
 *
 * Every call goes to `https://{tenant}.{region}.auth0.com/api/v2/…`. A token
 * minted without `audience: https://{domain}/api/v2/` is an *Authentication*
 * API token and the Management API rejects it — so the audience is derived from
 * the domain rather than asked for, because it is not a choice.
 *
 * Custom domains are deliberately unsupported: allowing an arbitrary host would
 * mean widening egress to `*` on the strength of a typed hostname, and the
 * canonical tenant domain always works for the Management API.
 *
 * ## Scopes are granted in the dashboard, not requested here
 *
 * A machine-to-machine application is authorised for specific Management API
 * scopes in Auth0's dashboard, and its token carries exactly those. Requesting
 * a scope it was not granted fails the whole token request; requesting none
 * yields everything it has. So a permission problem shows up as a `403` on one
 * endpoint, and the client's error message says so rather than blaming the
 * credential.
 *
 * ## Two levels of "who has access"
 *
 * A role assigned at the **tenant** means something everywhere; a role assigned
 * inside an **organization** means something for one customer. They are
 * separate, and `user-role-list` does not see the second — so an audit that
 * reads only one of them is wrong in a way that looks complete.
 *
 * ## Blocking, not deleting
 *
 * `user-update`'s `blocked` flag stops a sign-in, is reversible, and keeps the
 * audit trail. `user-delete` frees the email address for a fresh signup — so
 * anything holding the old user id silently points at nothing — and does not
 * revoke already-issued tokens. The delete action says both, and requires an
 * explicit confirmation.
 *
 * ## Secrets a workflow should never touch
 *
 *   - `password-change-ticket` mints a URL for the user to set their own
 *     password, so the automation never handles one. The URL is itself a bearer
 *     credential, which is why its lifetime is a first-class parameter.
 *   - `client-list` asks Auth0 for an explicit field list that **excludes
 *     `client_secret`**, so an application's secret is never in the response —
 *     a narrower promise than trusting nobody to log it.
 *
 * Deliberately out of scope:
 *   - **Tenant settings, email providers, custom domains, actions and rules** —
 *     changing how a tenant authenticates is a deploy, not a workflow step.
 *   - **Bulk user import/export jobs** — they exchange files, and the file is
 *     the point.
 *   - **Guardian / MFA enrolment management**, where a wrong call locks a
 *     person out of their own account.
 *   - **The Authentication API** (logging users in). This app administers a
 *     tenant; it does not authenticate anybody.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userGetByEmail from "./actions/user-get-by-email.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";

import userRoleList from "./actions/user-role-list.ts";
import userRoleAssign from "./actions/user-role-assign.ts";
import userRoleRemove from "./actions/user-role-remove.ts";
import roleList from "./actions/role-list.ts";

import passwordChangeTicket from "./actions/password-change-ticket.ts";
import verificationEmailSend from "./actions/verification-email-send.ts";

import organizationList from "./actions/organization-list.ts";
import organizationMemberList from "./actions/organization-member-list.ts";
import organizationMemberAdd from "./actions/organization-member-add.ts";

import connectionList from "./actions/connection-list.ts";
import clientList from "./actions/client-list.ts";
import logList from "./actions/log-list.ts";

import service from "./health/service.ts";
import tenant from "./health/tenant.ts";

export default {
  actions: [
    // finding people — and the two that are consistent
    userGet,
    userGetByEmail,
    userList,
    // changing them
    userCreate,
    userUpdate,
    userDelete,
    // what they can do
    userRoleList,
    userRoleAssign,
    userRoleRemove,
    roleList,
    // getting them started, without touching a password
    passwordChangeTicket,
    verificationEmailSend,
    // B2B
    organizationList,
    organizationMemberList,
    organizationMemberAdd,
    // how the tenant is wired
    connectionList,
    clientList,
    logList,
  ],
  auth: [clientCredentials],
  healthChecks: [service, tenant],
} satisfies AppDefinition;
