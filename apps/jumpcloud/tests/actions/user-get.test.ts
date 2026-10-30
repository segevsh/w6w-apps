import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const display = { display: { region: "us" } };

test("user-get: reads one user by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _id: "u1", state: "ACTIVATED" } }],
    display,
  );
  const result = await action.execute!({ userId: "u1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://console.jumpcloud.com/api/systemusers/u1");
  assertEquals(result.state, "ACTIVATED");
});

test("user-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`userId`");
  assertEquals(calls.length, 0);
});
