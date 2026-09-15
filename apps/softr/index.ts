/**
 * Softr — records in a Softr app's own Database, plus the users signed up to
 * a published app, over two separately-hosted first-party APIs.
 *
 * Verified 2026-09-15 against Softr's own documentation
 * (`docs.softr.io/softr-api/...`): the OpenAPI-generated "Softr Database API"
 * reference for records/tables/databases (production server
 * `tables-api.softr.io`), and the prose "API Setup and Endpoints" guide for
 * the Studio Users API (`studio-api.softr.io`). Nothing here came from a
 * third-party integration directory.
 *
 * The three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **This is not an Airtable/Sheets proxy** (`lib/client.ts`). Softr apps
 *     can be built on an external Airtable base or Google Sheet, but Softr's
 *     API documents no endpoint that reads or writes such a connected source
 *     — only its own native "Softr Database" tables. Point at the Airtable or
 *     Google Sheets app directly for those.
 *  2. **Two hosts, one token, two auth shapes** (`lib/client.ts`,
 *     `auth/api-key.ts`). Both APIs take the same Personal Access Token in
 *     the same `Softr-Api-Key` header, but the Database API scopes by
 *     workspace + path segment while the Users API scopes by a `Softr-Domain`
 *     header naming the target app — sent per-call, since it names a public
 *     hostname rather than a secret.
 *  3. **One documented endpoint is out of reach of a static allowlist**:
 *     `POST /v1/api/users/validate-token` is called against the Softr app's
 *     *own* live domain (`https://yourdomain.softr.app/...` or a connected
 *     custom domain) — a value that varies per app and per customer — so it
 *     cannot be declared in `w6w.network.allow` without a wildcard this app
 *     has no fixed host to narrow. Left unimplemented; every other documented
 *     endpoint lives on one of the two fixed hosts this app declares.
 *
 * No machine-readable status feed or rate-limit-headroom signal exists on
 * either host — see `health/service.ts` and `health/quota.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import databaseList from "./actions/database-list.ts";
import databaseGet from "./actions/database-get.ts";

import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";
import tableViewsList from "./actions/table-views-list.ts";

import recordList from "./actions/record-list.ts";
import recordSearch from "./actions/record-search.ts";
import recordGet from "./actions/record-get.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";

import userCreate from "./actions/user-create.ts";
import userDelete from "./actions/user-delete.ts";
import userActivate from "./actions/user-activate.ts";
import userDeactivate from "./actions/user-deactivate.ts";
import userInvite from "./actions/user-invite.ts";
import userMagicLinkGenerate from "./actions/user-magic-link-generate.ts";
import userSync from "./actions/user-sync.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Databases
    databaseList,
    databaseGet,
    // Tables
    tableList,
    tableGet,
    tableViewsList,
    // Records
    recordList,
    recordSearch,
    recordGet,
    recordCreate,
    recordUpdate,
    recordDelete,
    // Users (Studio API)
    userCreate,
    userDelete,
    userActivate,
    userDeactivate,
    userInvite,
    userMagicLinkGenerate,
    userSync,
  ],
  // One Personal Access Token, shared by both hosts. Softr documents no OAuth
  // surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
