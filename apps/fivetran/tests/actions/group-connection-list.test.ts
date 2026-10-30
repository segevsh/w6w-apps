import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/group-connection-list.ts";

test("group-connection-list: reads what feeds one destination", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "c1", paused: false },
    { id: "c2", paused: true },
  ])]);
  const result = await action.execute!({ groupId: "g1" }, ctx) as {
    count: number;
    pausedCount: number;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.fivetran.com/v1/groups/g1/connections",
  );
  assertEquals(result.count, 2);
  assertEquals(result.pausedCount, 1);
});

test("group-connection-list: needs a group id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "groupId");
  assertEquals(calls.length, 0);
});

/** The check that catches a connection pointed at the wrong environment. */
test("group-connection-list: names the mistake it catches", () => {
  assert(/wrong environment/.test(action.description!), action.description);
});
