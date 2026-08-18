import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `GET /v1/connections/{id}/schemas` — which tables and columns are actually
 * being synced.
 *
 * The answer to "why is that column missing from the warehouse", which is the
 * most common question a data team asks about Fivetran and is almost never an
 * outage. A table or column can be **disabled** — by default for a new table
 * Fivetran discovered, or because somebody turned it off — and a disabled
 * column is simply absent downstream with nothing reporting it.
 *
 * It is also where **blocked** columns appear: ones Fivetran cannot sync
 * because the destination rejected them, usually a type or a name it will not
 * accept. Those are different from disabled — nobody chose them — and they are
 * the ones worth alerting on.
 *
 * This action counts both rather than making a caller walk a nested structure
 * of schemas, tables and columns to find out.
 */
const action: ActionDefinition = {
  key: "connection-schema-get",
  type: "read",
  resource: "connection",
  title: "Get a connection's schema config",
  description:
    "Which tables and columns are actually syncing. The answer to 'why is that column missing' — " +
    "usually disabled rather than broken, and blocked columns are the ones nobody chose.",
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "schemas", type: "object", label: "Fivetran's nested schema config" },
    { key: "schemaCount", type: "number", label: "Schemas in the connection" },
    { key: "enabledTables", type: "number", label: "Tables being synced" },
    { key: "disabledTables", type: "number", label: "Tables switched off" },
    { key: "schema_change_handling", type: "string", label: "What happens to new tables" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");

    const config = await new FivetranClient(ctx).request<{
      schemas?: Record<
        string,
        { enabled?: boolean; tables?: Record<string, { enabled?: boolean }> }
      >;
      schema_change_handling?: string;
    }>(`/v1/connections/${encodeURIComponent(connectionId)}/schemas`);

    const schemas = config?.schemas ?? {};
    let enabledTables = 0;
    let disabledTables = 0;
    for (const schema of Object.values(schemas)) {
      for (const table of Object.values(schema?.tables ?? {})) {
        if (table?.enabled === false) disabledTables += 1;
        else enabledTables += 1;
      }
    }

    return {
      ...config,
      schemaCount: Object.keys(schemas).length,
      enabledTables,
      disabledTables,
    };
  },
};

export default action;
