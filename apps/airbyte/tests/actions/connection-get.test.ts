import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-get.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const UUID = "e735894a-e773-4938-969f-45f53957b75b";
const connection = (streams: unknown[]) => ({
  status: 200,
  body: {
    name: "Postgres to Snowflake",
    status: "active",
    sourceId: "s1",
    destinationId: "d1",
    schedule: { scheduleType: "cron" },
    namespaceFormat: "raw_${SOURCE_NAMESPACE}",
    configurations: { streams },
  },
});

/** The sync mode decides whether a table is replaced, appended or deduplicated. */
Deno.test("connection-get: returns each stream's sync mode", async () => {
  const { ctx, calls } = mockCtx([connection([
    { name: "orders", syncMode: "incremental_deduped_history", primaryKey: [["id"]] },
    { name: "events", syncMode: "incremental_append", cursorField: ["created_at"] },
  ])], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, `/v1/connections/${UUID}`);
  assertEquals(result.streamCount, 2);
  assertEquals(result.isActive, true);
  const streams = result.streams as Array<{ name: string; hasPrimaryKey: boolean }>;
  assertEquals(streams[0].hasPrimaryKey, true);
  assertEquals(streams[1].hasPrimaryKey, false);
});

/** Append modes accumulate: a re-sync of the same rows doubles the table. */
Deno.test("connection-get: names the append-only streams, and notes what that means", async () => {
  const { ctx, logs } = mockCtx([connection([
    { name: "orders", syncMode: "incremental_deduped_history" },
    { name: "events", syncMode: "incremental_append" },
    { name: "snapshots", syncMode: "full_refresh_append" },
  ])], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.appendOnlyStreams, ["events", "snapshots"]);
  assert(
    logs.some((l) => /wrong for a table anybody joins on/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("connection-get: an overwrite-only connection says nothing", async () => {
  const { ctx, logs } = mockCtx([connection([
    { name: "orders", syncMode: "full_refresh_overwrite" },
  ])], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.appendOnlyStreams, []);
  assertEquals(logs.length, 0);
});

Deno.test("connection-get: reports where in the destination the data lands", async () => {
  const { ctx } = mockCtx([connection([])], D);
  const result = await action.execute({ connectionId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.namespace, "raw_${SOURCE_NAMESPACE}");
});

Deno.test("connection-get: refuses anything that is not a UUID", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ connectionId: "12345" }, ctx),
    Error,
    "must be a UUID",
  );
  assertEquals(calls.length, 0);
});
