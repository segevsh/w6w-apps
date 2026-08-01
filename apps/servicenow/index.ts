/**
 * ServiceNow — w6w port of n8n's `ServiceNow` node, scoped to the incident
 * table plus the generic Table API.
 *
 * The thing that shapes this app is that **every customer has its own
 * host** — `acme.service-now.com`. A static manifest cannot enumerate those,
 * so:
 *
 *   - `w6w.network.allow` declares `*.service-now.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the instance name is an Auth field, not an Action param: it identifies
 *     the account, so it belongs to the Connection. `afterConnect` records it
 *     on the connection's redacted `display`, and `lib/client.ts` reads it
 *     from there — so the client can address the right host without ever
 *     seeing a credential.
 *
 * Two Actions groups:
 *
 *   - `incident-*` — the common ITSM case, against the `incident` table.
 *   - `table-record-*` — the same CRUD verbs against ANY table (`problem`,
 *     `change_request`, a custom `u_*` table, …), for everything the
 *     incident-specific actions don't cover.
 *
 * Deliberately absent: n8n's `attachment`, `businessService`,
 * `configurationItems`, `department`, `dictionary`, `user`, `userGroup` and
 * `userRole` resources, which are all just the generic Table API pointed at
 * a different table name — `table-record-*` already covers them (e.g.
 * `table: "sys_user"` for users, `table: "cmdb_ci"` for configuration
 * items).
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import oauth2 from "./auth/oauth2.ts";

import incidentCreate from "./actions/incident-create.ts";
import incidentGet from "./actions/incident-get.ts";
import incidentGetMany from "./actions/incident-get-many.ts";
import incidentUpdate from "./actions/incident-update.ts";

import tableRecordCreate from "./actions/table-record-create.ts";
import tableRecordGet from "./actions/table-record-get.ts";
import tableRecordGetMany from "./actions/table-record-get-many.ts";
import tableRecordUpdate from "./actions/table-record-update.ts";
import tableRecordDelete from "./actions/table-record-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import instance from "./health/instance.ts";

export default {
  actions: [
    // incident
    incidentCreate,
    incidentGet,
    incidentGetMany,
    incidentUpdate,
    // generic table record
    tableRecordCreate,
    tableRecordGet,
    tableRecordGetMany,
    tableRecordUpdate,
    tableRecordDelete,
  ],
  auth: [basic, oauth2],
  healthChecks: [service, quota, instance],
} satisfies AppDefinition;
