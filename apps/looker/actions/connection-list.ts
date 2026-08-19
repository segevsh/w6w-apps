import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/connections` — the databases Looker queries.
 *
 * ## This is where a query's cost actually lands
 *
 * Every Look and every Explore resolves to one of these connections, and the
 * bill for running them belongs to whoever owns that warehouse. `dialect_name`
 * is worth reading before pointing a scheduled workflow at a model: a query
 * against BigQuery is metered per byte scanned, and one against a provisioned
 * Postgres competes with everything else on that instance.
 *
 * ## `max_connections` is the real concurrency ceiling
 *
 * Looker holds a pool per connection. A workflow running several queries at
 * once shares it with every human using the interface, and exhausting it makes
 * Looker queue — which presents as everything being slow rather than as
 * anything failing.
 *
 * ## PDT settings decide whether a query can build tables
 *
 * A connection with persistent derived tables enabled lets a query trigger a
 * table build in the warehouse — which is a much larger operation than a
 * SELECT, and one a workflow can set off without meaning to.
 *
 * ## The credentials are not returned, and that is deliberate
 *
 * Looker omits connection passwords from this endpoint. Nothing this app does
 * can retrieve them, which is the correct behaviour and worth stating so nobody
 * goes looking.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "read",
  resource: "connection",
  title: "List database connections",
  description:
    "The warehouses Looker queries — where the cost of every Look actually lands. Reports the " +
    "dialect, the connection-pool ceiling that queries share with the interface, and whether a " +
    "query could trigger a derived-table build.",
  params: [],
  output: [
    { key: "connections", type: "array", label: "The connections, without credentials" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "dialects", type: "array", label: "The distinct database engines" },
    { key: "pdtEnabled", type: "array", label: "Connections where a query can build tables" },
    { key: "smallestPool", type: "object", label: "The tightest concurrency ceiling" },
  ],

  async execute(_input, ctx) {
    const all = await new LookerClient(ctx).request<
      Array<{
        name?: string;
        dialect_name?: string;
        host?: string;
        database?: string;
        max_connections?: number;
        pdt_context_override?: unknown;
        uses_tmp_table?: boolean;
        disabled?: boolean;
      }>
    >("/connections", {
      query: {
        fields: "name,dialect_name,host,database,max_connections,uses_tmp_table,disabled",
      },
    });

    const list = Array.isArray(all) ? all : [];
    // Looker omits connection passwords here, which is correct.
    const connections = list.map((connection) => ({
      name: connection?.name,
      dialect: connection?.dialect_name,
      host: connection?.host,
      database: connection?.database,
      maxConnections: connection?.max_connections,
      canBuildTables: connection?.uses_tmp_table === true,
      disabled: connection?.disabled === true,
    }));

    const withPool = connections
      .filter((connection) => typeof connection.maxConnections === "number")
      .sort((a, b) => Number(a.maxConnections) - Number(b.maxConnections));

    return {
      connections,
      count: connections.length,
      names: connections.map((connection) => connection.name).filter(Boolean),
      dialects: [
        ...new Set(connections.map((connection) => connection.dialect).filter(Boolean) as string[]),
      ].sort(),
      pdtEnabled: connections
        .filter((connection) => connection.canBuildTables)
        .map((connection) => connection.name)
        .filter(Boolean),
      // Queries share this pool with everybody using the interface.
      smallestPool: withPool[0],
    };
  },
};

export default action;
