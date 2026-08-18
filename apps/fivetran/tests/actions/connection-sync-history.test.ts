import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/connection-sync-history.ts";

Deno.test("connection-sync-history: reads the runs and counts the failures", async () => {
  const { ctx, calls } = mockCtx([page([
    { status: "SUCCESSFUL" },
    { status: "FAILURE" },
    { status: "SUCCESSFUL" },
  ])]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    count: number;
    failedCount: number;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.fivetran.com/v1/connections/c1/sync-history",
  );
  assertEquals(result.count, 3);
  assertEquals(result.failedCount, 1);
});

Deno.test("connection-sync-history: the window is normalised to ISO timestamps", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({
    connectionId: "c1",
    startTime: "2026-08-15",
    endTime: "2026-08-18",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("start_time"), "2026-08-15T00:00:00.000Z");
  assertEquals(q.get("end_time"), "2026-08-18T00:00:00.000Z");
});

/** Fivetran caps the window at seven days and truncates silently. */
Deno.test("connection-sync-history: a range over seven days is refused, not truncated", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({
        connectionId: "c1",
        startTime: "2026-07-01",
        endTime: "2026-08-01",
      }, ctx),
    Error,
    "seven-day window",
  );
  assertEquals(calls.length, 0);
});

Deno.test("connection-sync-history: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

Deno.test("connection-sync-history: states the seven-day cap", () => {
  assert(/SEVEN DAYS/.test(action.description!), action.description);
});
