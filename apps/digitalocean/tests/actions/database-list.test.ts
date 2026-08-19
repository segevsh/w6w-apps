import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/database-list.ts";

const page = {
  status: 200,
  body: {
    databases: [
      {
        id: "db-1",
        name: "primary",
        engine: "pg",
        version: "16",
        status: "online",
        num_nodes: 3,
        region: "fra1",
        connection: {
          host: "db-1.db.ondigitalocean.com",
          port: 25060,
          database: "defaultdb",
          user: "doadmin",
          uri: "postgresql://doadmin:SUPERSECRET@db-1.db.ondigitalocean.com:25060/defaultdb",
        },
        private_connection: { host: "private-db-1.db.ondigitalocean.com", port: 25060 },
      },
    ],
    meta: { total: 1 },
  },
};

Deno.test("database-list: reads the clusters", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/databases");
  assertEquals(result.count, 1);
  assertEquals(result.engines, ["pg"]);
  assertEquals(result.totalNodes, 3);
});

/** The URI embeds the admin password; a workflow's data is a log. */
Deno.test("database-list: returns the host and port and never the connection URI", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const serialised = JSON.stringify(result);
  assertEquals(serialised.includes("SUPERSECRET"), false);
  assertEquals(serialised.includes("postgresql://"), false);
  const cluster = (result.databases as Array<Record<string, unknown>>)[0];
  assertEquals(cluster.host, "db-1.db.ondigitalocean.com");
  assertEquals(cluster.port, 25060);
  assertEquals(cluster.user, "doadmin");
  assertEquals("uri" in cluster, false);
});

/** Private traffic is not billed and does not leave the VPC. */
Deno.test("database-list: returns the private endpoint separately", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const cluster = (result.databases as Array<Record<string, unknown>>)[0];
  assertEquals(cluster.privateHost, "private-db-1.db.ondigitalocean.com");
});

Deno.test("database-list: counts by status", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.byStatus, { online: 1 });
});

/** The firewall starts closed and presents as a timeout. */
Deno.test("database-list: says the password is stripped and why", () => {
  assert(/embed the ADMIN PASSWORD/.test(action.description!), action.description);
  assert(/a credential in a log/.test(action.description!), action.description);
});

Deno.test("database-list: no clusters is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { databases: [], meta: { total: 0 } } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.totalNodes, 0);
});
