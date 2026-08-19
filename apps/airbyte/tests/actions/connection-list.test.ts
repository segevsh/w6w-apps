import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-list.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const connections = {
  status: 200,
  body: {
    data: [
      {
        connectionId: "c1",
        name: "Postgres to Snowflake",
        status: "active",
        schedule: { scheduleType: "cron", cronExpression: "0 * * * *" },
      },
      {
        connectionId: "c2",
        name: "Stripe to BigQuery",
        status: "inactive",
        schedule: { scheduleType: "basic" },
      },
      {
        connectionId: "c3",
        name: "Manual backfill",
        status: "active",
        schedule: { scheduleType: "manual" },
      },
    ],
  },
};

/** A paused connection is the commonest cause of stale data. */
Deno.test("connection-list: separates inactive connections and says why it matters", async () => {
  const { ctx, calls, logs } = mockCtx([connections], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/connections");
  assertEquals(result.inactive, ["Stripe to BigQuery"]);
  assert(
    logs.some((l) => /nothing in the destination says so/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A manual connection never runs on its own. */
Deno.test("connection-list: names the connections that only run when asked", async () => {
  const { ctx } = mockCtx([connections], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.manualOnly, ["Manual backfill"]);
  assertEquals(result.scheduled, 2);
});

Deno.test("connection-list: counts each status and returns the ids", async () => {
  const { ctx } = mockCtx([connections], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.byStatus, { active: 2, inactive: 1 });
  assertEquals(result.ids, ["c1", "c2", "c3"]);
});

Deno.test("connection-list: the workspace filter and paging reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await action.execute({ workspaceIds: "w1, w2", includeDeleted: true, limit: 50 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("workspaceIds"), "w1,w2");
  assertEquals(q.get("includeDeleted"), "true");
  assertEquals(q.get("limit"), "50");
});

Deno.test("connection-list: all-active warns about nothing", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { data: [connections.body.data[0]] },
  }], D);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});
