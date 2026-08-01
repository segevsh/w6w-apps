/**
 * Snowflake — SQL over the Snowflake SQL API v2.
 *
 * Unlike a raw database driver (the wire protocol most integrations use),
 * Snowflake exposes a real HTTPS REST API that executes SQL statements, so
 * this app fits the network-less, `ctx.fetch`-only sandbox with no scoping
 * compromise: every action is a direct call to
 * `https://<account>.snowflakecomputing.com/api/v2/statements[…]`.
 *
 * The thing that shapes this app, same as Zendesk/Shopify/Salesforce, is
 * that **every account has its own host**. A static manifest can't enumerate
 * those, so:
 *
 *   - `w6w.network.allow` declares `*.snowflakecomputing.com`.
 *   - the account identifier is an Auth field, not an Action param — it
 *     belongs to the Connection. `afterConnect` records it on the
 *     connection's redacted `display`, and `lib/client.ts` reads it from
 *     there.
 *
 * Auth is RSA key-pair JWT (see `auth/key-pair.ts` for why, over OAuth2).
 * Deliberately narrow on actions: this is a statement-execution API, not a
 * CRUD one, so the surface is submit/poll/cancel plus two `SHOW …`
 * convenience wrappers — not an invented breadth the vendor API doesn't have.
 */
import type { AppDefinition } from "@w6w/types";
import keyPair from "./auth/key-pair.ts";

import statementExecute from "./actions/statement-execute.ts";
import statementGet from "./actions/statement-get.ts";
import statementCancel from "./actions/statement-cancel.ts";
import databaseList from "./actions/database-list.ts";
import warehouseList from "./actions/warehouse-list.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";

export default {
  actions: [
    statementExecute,
    statementGet,
    statementCancel,
    databaseList,
    warehouseList,
  ],
  auth: [keyPair],
  healthChecks: [service, account],
} satisfies AppDefinition;
