/**
 * Zoho Analytics — BI workspaces, over the Zoho Analytics REST API v2
 * (`https://analyticsapi.zoho.com/restapi/v2/...`, and its seven regional
 * siblings).
 *
 * Every path, verb, header, query parameter and response shape in this app
 * was verified on 2026-09-29 against Zoho's own documentation — the live
 * pages under `https://www.zoho.com/analytics/api/v2/` (`prerequisites.html`,
 * `authentication.html` plus its five `authentication/*.html` steps,
 * `data-api.html`, `data-api/add-row.html`, `data-api/update-row.html`,
 * `data-api/delete-row.html`, `data-api/error-codes.html`, `bulk-api.html`,
 * `bulk-api/import-data/new-table.html`, `bulk-api/export-data.html`,
 * `bulk-api/error-codes.html`, `metadata-api/workspace-details.html`,
 * `metadata-api/owned-workspace.html`, `metadata-api/shared-workspace.html`,
 * `user-management-api/get-workspace-users.html`,
 * `sharing-and-collaboration-api/org-admin.html`) — and live probes against
 * every regional API host. Those doc pages are not reachable from Zoho's own
 * site navigation (the left menu is client-rendered JS, and the pages are
 * absent from zoho.com's sitemap) but were located via the Wayback Machine's
 * URL index and re-fetched live to confirm they are real, current, and
 * answer the shape claimed. Nothing here came from a third-party integration
 * directory.
 *
 * Scoped to **Zoho Analytics specifically** — this pack already ships
 * `zoho` (Zoho CRM), `zohobooks` (Zoho Books), `zohomail` (Zoho Mail) and
 * several other Zoho products with separate API surfaces; do not confuse
 * them.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The real API host is `analyticsapi.zoho.<tld>` — not the shared
 *     `www.zohoapis.<tld>` gateway `zohobooks`/`zoho-invoice` use, and not
 *     the `analytics.zoho.com` alias a Postman-collection doc page's
 *     example variable happens to name** (`lib/regions.ts`). Every real,
 *     copy-paste `curl` sample across every endpoint page in the docs uses
 *     `analyticsapi.zoho.com`; both alternate hosts also resolve and answer
 *     the same envelope, but the documented one is what this app addresses.
 *  2. **Multi-data-centre, and Canada breaks the naming pattern for the API
 *     host itself, not just the OAuth host** (`lib/regions.ts`,
 *     `auth/oauth2.ts`). `zohobooks`/`zoho-invoice` already document
 *     Canada's OAuth host as the odd one out (`accounts.zohocloud.ca`, not
 *     `accounts.zoho.ca`); for Zoho Analytics that same substitution
 *     applies to the *API* host too — `analyticsapi.zoho.ca` does not
 *     resolve at all, `analyticsapi.zohocloud.ca` does and answers the
 *     documented envelope (verified live).
 *  3. **The organization id is a HEADER (`ZANALYTICS-ORGID`), not a query
 *     parameter, and only some calls need it** (`lib/client.ts`). Unlike
 *     Zoho Books (`organization_id` query param on nearly every call), Zoho
 *     Analytics sends it as a header, and workspace discovery/detail calls
 *     (`GET /workspaces/owned`, `/shared`, `/<id>`) need no org id at all,
 *     since a workspace id alone already identifies its organization —
 *     everything that acts ON a workspace's rows/users, or lists an org's
 *     admins, does need it.
 *  4. **Every data-mutating call's parameters ride the `CONFIG` query
 *     parameter as a JSON blob — even on POST/PUT/DELETE — never a JSON
 *     request body** (`lib/client.ts`). `Add Row`/`Update Row`/`Delete
 *     Row`/`Export Data` all follow this; `Import Data` is the one
 *     exception that also carries a `multipart/form-data` `FILE` field
 *     alongside the same `CONFIG` query parameter.
 *  5. **`Export Data` does not answer the standard `{status,summary,data}`
 *     envelope** (`lib/client.ts`, `actions/data-export.ts`) — a success
 *     streams the view's own data back in the requested format
 *     (`Content-Type: text/csv`, `application/json`, ...), which is why it
 *     goes through a dedicated `requestRaw` rather than the JSON-unwrapping
 *     `request`.
 *  6. **No quota surface exists** (`health/quota.ts`). Zoho Analytics
 *     documents a real per-plan daily API-unit budget and a detailed
 *     per-action unit-cost table, but exposes no `X-RateLimit-*` (or
 *     equivalent) response header to probe headroom ahead of the eventual
 *     quota error — declared absent rather than guessed.
 *
 * Deliberately absent: the Asynchronous Import/Export APIs (needed for
 * tables over 1M rows, live-connect workspaces, and Dashboard/QueryTable
 * views), importing into an *existing* table, workspace/view/column
 * administration (create, rename, delete, copy), formulas, variables, email
 * schedules, embedding, and single sign-on — none of those are core CRUD
 * workflow automation, and several are large enough to be their own app.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import workspaceListOwned from "./actions/workspace-list-owned.ts";
import workspaceListShared from "./actions/workspace-list-shared.ts";
import workspaceGet from "./actions/workspace-get.ts";

import rowAdd from "./actions/row-add.ts";
import rowUpdate from "./actions/row-update.ts";
import rowDelete from "./actions/row-delete.ts";

import dataExport from "./actions/data-export.ts";
import dataImportNewTable from "./actions/data-import-new-table.ts";

import workspaceUsersList from "./actions/workspace-users-list.ts";
import orgAdminList from "./actions/org-admin-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // workspaces
    workspaceListOwned,
    workspaceListShared,
    workspaceGet,
    // rows
    rowAdd,
    rowUpdate,
    rowDelete,
    // bulk data
    dataExport,
    dataImportNewTable,
    // users / admins
    workspaceUsersList,
    orgAdminList,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
