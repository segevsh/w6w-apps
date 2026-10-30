import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-get.ts";

test("connection-get: a connected connection is healthy", async () => {
  const { ctx, calls } = mockCtx([ok({
    id: "c1",
    schema: "shop",
    status: { setup_state: "connected", sync_state: "scheduled", warnings: [] },
  })]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    healthy: boolean;
    syncing: boolean;
    hasWarnings: boolean;
  };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1");
  assertEquals(result.healthy, true);
  assertEquals(result.syncing, false);
  assertEquals(result.hasWarnings, false);
});

/** Broken stops syncing silently — the warehouse stops changing. */
test("connection-get: a broken connection is not healthy", async () => {
  const { ctx } = mockCtx([ok({ status: { setup_state: "broken", sync_state: "paused" } })]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as { healthy: boolean };
  assertEquals(result.healthy, false);
});

/** Syncing happily while the data arrives incomplete. */
test("connection-get: warnings are surfaced separately from health", async () => {
  const { ctx } = mockCtx([ok({
    status: { setup_state: "connected", sync_state: "syncing", warnings: [{ code: "x" }] },
  })]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    healthy: boolean;
    syncing: boolean;
    hasWarnings: boolean;
  };
  assertEquals(result.healthy, true);
  assertEquals(result.syncing, true);
  assertEquals(result.hasWarnings, true);
});

test("connection-get: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

test("connection-get: distinguishes the two states in its description", () => {
  assert(/stops syncing silently/.test(action.description!), action.description);
});
