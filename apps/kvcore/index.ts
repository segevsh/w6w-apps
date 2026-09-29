/**
 * kvCORE — Inside Real Estate's real-estate CRM (mid-rebrand to "BoldTrail"),
 * over the kvCORE Public API V2 (`api.kvcore.com`).
 *
 * Every path, verb, field and error shape in this app was verified on
 * 2026-09-29 against the vendor's own OpenAPI 3.1 document — server-side
 * rendered into every `developer.insiderealestate.com/publicv2/reference/*`
 * page (ReadMe project "kvCORE Public API V2", subdomain `testire`) — plus
 * live, unauthenticated probes against `api.kvcore.com` and
 * `status.insiderealestate.com` on the same day. Nothing here came from a
 * third-party integration directory.
 *
 * ## Two APIs, one chosen deliberately (`lib/client.ts`, `auth/bearer-token.ts`)
 *
 * The developer hub currently documents a *second*, newer OAuth 2.1 API at
 * `api.boldtrail.com`, whose own "Request access" page states it is
 * invite-only and not yet publicly available. This app targets the V2 API
 * instead, because it is the one with a real, self-serve credential path
 * today: any kvCORE user can generate a scoped bearer token from their own
 * account's Lead Dropbox, no partner approval required.
 *
 * ## Single fixed host, not per-tenant (`lib/client.ts`)
 *
 * The OpenAPI document declares exactly one server for every documented
 * path, and a live probe against that exact host answers with a real,
 * account-agnostic auth error rather than a DNS failure — confirmed there is
 * no per-brokerage subdomain to express as a connection field.
 *
 * ## Two findings that shaped the design
 *
 *  1. **The error envelope is uniform but its payload shape is not**
 *     (`lib/client.ts`). Every failure carries `{"errors": ...}`, but the
 *     value is sometimes a flat array of messages and sometimes a
 *     Laravel-style per-field validation map — `flattenKvCoreErrors` reads
 *     both without guessing which one a given status implies.
 *  2. **Token scopes are independent, and no probe covers all of them**
 *     (`auth/bearer-token.ts`). A kvCORE bearer token is scoped to `All`,
 *     `Contacts`, or `Users`, and no documented endpoint is reachable by
 *     every scope. This app's health probe reads `GET /contacts`, matching
 *     its own primarily contact-and-account-management action surface, and
 *     says explicitly (both in the probe's own doc comment and in its `403`
 *     branch) that a `Users`-only token will fail it even though it may be
 *     perfectly live for its own narrower scope.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactTagsAdd from "./actions/contact-tags-add.ts";
import contactTagsRemove from "./actions/contact-tags-remove.ts";
import contactNoteAdd from "./actions/contact-note-add.ts";

import userCreate from "./actions/user-create.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";

import officeCreate from "./actions/office-create.ts";
import officeGet from "./actions/office-get.ts";
import officeList from "./actions/office-list.ts";
import officeUpdate from "./actions/office-update.ts";
import officeDelete from "./actions/office-delete.ts";
import officeUserAdd from "./actions/office-user-add.ts";
import officeUserRemove from "./actions/office-user-remove.ts";

import teamCreate from "./actions/team-create.ts";
import teamGet from "./actions/team-get.ts";
import teamList from "./actions/team-list.ts";
import teamUpdate from "./actions/team-update.ts";
import teamDelete from "./actions/team-delete.ts";
import teamUserAdd from "./actions/team-user-add.ts";
import teamUserRemove from "./actions/team-user-remove.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactCreate,
    contactGet,
    contactList,
    contactUpdate,
    contactTagsAdd,
    contactTagsRemove,
    contactNoteAdd,
    // Users
    userCreate,
    userGet,
    userList,
    userUpdate,
    userDelete,
    // Offices
    officeCreate,
    officeGet,
    officeList,
    officeUpdate,
    officeDelete,
    officeUserAdd,
    officeUserRemove,
    // Teams
    teamCreate,
    teamGet,
    teamList,
    teamUpdate,
    teamDelete,
    teamUserAdd,
    teamUserRemove,
  ],
  // Bearer token only — see auth/bearer-token.ts for why this app targets
  // the V2 API's self-serve token rather than the newer, invite-only OAuth
  // API kvCORE's developer hub also documents.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
