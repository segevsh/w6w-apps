import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-personal-info-get.ts";

/** Personal info is keyed by worker id, not the HRIS profile id. */
test("person-personal-info-get: uses the worker id and its own endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], { display: {} });
  await action.execute!({ workerId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/people/w1/personal");
});

test("person-personal-info-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`workerId`");
  assertEquals(calls.length, 0);
});
