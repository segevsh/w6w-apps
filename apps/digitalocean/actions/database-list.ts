import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient } from "../lib/client.ts";

/**
 * `GET /v2/databases` — managed database clusters.
 *
 * ## The connection details include a password, and this does not return it
 *
 * `connection` and `private_connection` carry a URI with the admin password
 * embedded. That is genuinely useful and genuinely a credential, so this action
 * returns the host, port and database name separately and **strips the
 * password from the URI**, rather than handing a full connection string into a
 * workflow's data where it would be logged and stored.
 *
 * A workflow that needs to connect should hold the credential itself.
 *
 * ## `private_connection` is the one to use from a droplet
 *
 * Traffic over the private network is not billed and does not leave the VPC.
 * The public connection string is billed as bandwidth and is reachable from
 * wherever the firewall allows — which for a managed database defaults to
 * nothing until a trusted source is added.
 *
 * ## A cluster with no trusted sources accepts nothing
 *
 * Like most of DigitalOcean's managed products, the firewall starts closed. A
 * database that "will not accept connections" from a new droplet is almost
 * always this, and it presents as a timeout rather than as a refusal.
 */
const action: ActionDefinition = {
  key: "database-list",
  type: "search",
  resource: "database",
  title: "List database clusters",
  description:
    "Managed database clusters. The API's connection strings embed the ADMIN PASSWORD, so this " +
    "returns the host, port and name separately and strips it — a full connection string in a " +
    "workflow's data is a credential in a log.",
  params: [],
  output: [
    { key: "databases", type: "array", label: "The clusters, with passwords stripped" },
    { key: "count", type: "number", label: "How many" },
    { key: "ids", type: "array", label: "Just the cluster ids — these are UUIDs" },
    { key: "engines", type: "array", label: "The distinct engines" },
    { key: "byStatus", type: "object", label: "How many in each state" },
    { key: "totalNodes", type: "number", label: "Nodes across all clusters" },
  ],

  async execute(_input, ctx) {
    const page = await new DigitalOceanClient(ctx).list<{
      id?: string;
      name?: string;
      engine?: string;
      version?: string;
      status?: string;
      num_nodes?: number;
      region?: string;
      connection?: { host?: string; port?: number; database?: string; user?: string; uri?: string };
      private_connection?: { host?: string; port?: number };
    }>("/v2/databases", "databases");

    const databases = page.items.map((cluster) => ({
      id: cluster?.id,
      name: cluster?.name,
      engine: cluster?.engine,
      version: cluster?.version,
      status: cluster?.status,
      region: cluster?.region,
      numNodes: cluster?.num_nodes,
      // Host, port and name — never the URI, which embeds the password.
      host: cluster?.connection?.host,
      port: cluster?.connection?.port,
      database: cluster?.connection?.database,
      user: cluster?.connection?.user,
      // Not billed as bandwidth, and does not leave the VPC.
      privateHost: cluster?.private_connection?.host,
      privatePort: cluster?.private_connection?.port,
    }));

    const byStatus: Record<string, number> = {};
    for (const cluster of databases) {
      const status = String(cluster.status ?? "unknown");
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    return {
      databases,
      count: databases.length,
      ids: databases.map((cluster) => cluster.id).filter(Boolean),
      engines: [
        ...new Set(databases.map((cluster) => cluster.engine).filter(Boolean) as string[]),
      ].sort(),
      byStatus,
      totalNodes: databases.reduce((sum, cluster) => sum + (Number(cluster.numNodes ?? 0) || 0), 0),
    };
  },
};

export default action;
