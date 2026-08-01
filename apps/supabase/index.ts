/**
 * Supabase — w6w port covering the auto-generated PostgREST data REST API.
 *
 * SCOPING DECISION: this app is Supabase, not generic/raw Postgres. w6w Apps
 * run in a network-less sandbox reachable only via `ctx.fetch` over HTTP(S) to
 * hosts declared in a static `network.allow` list — there is no raw TCP
 * socket access, so the Postgres wire protocol (what "generic Postgres" would
 * need) genuinely cannot be supported here, and neither can an arbitrary
 * self-hosted PostgREST endpoint (its domain is unknown at publish time, so
 * it can't go in a static allowlist). Supabase fronts every project's
 * database with a real, well-documented HTTP REST API (PostgREST, mounted at
 * `/rest/v1`) on a fixed domain suffix (`*.supabase.co`), which fits this
 * sandbox and is a widely-used real product for exactly this "automate my
 * Postgres data over HTTP" use case. See README.md.
 *
 * The thing that shapes this app is that **every project has its own host** —
 * `<project-ref>.supabase.co`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.supabase.co`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the project URL is an Auth field, not an Action param: it identifies
 *     the project, so it belongs to the Connection. `afterConnect` records it
 *     on the connection's redacted `display`, and `lib/client.ts` reads it
 *     from there — so actions can address the right host without ever seeing
 *     a credential.
 *
 * Actions are deliberately table-agnostic (every action takes a `table` or
 * `function` param) rather than one action per table, since a project's
 * schema isn't known at publish time.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import rowsList from "./actions/rows-list.ts";
import rowGet from "./actions/row-get.ts";
import rowsCount from "./actions/rows-count.ts";
import rowsInsert from "./actions/rows-insert.ts";
import rowsUpdate from "./actions/rows-update.ts";
import rowsDelete from "./actions/rows-delete.ts";
import rpcCall from "./actions/rpc-call.ts";

import service from "./health/service.ts";
import reachable from "./health/reachable.ts";

export default {
  actions: [
    rowsList,
    rowGet,
    rowsCount,
    rowsInsert,
    rowsUpdate,
    rowsDelete,
    rpcCall,
  ],
  auth: [apiKey],
  healthChecks: [service, reachable],
} satisfies AppDefinition;
