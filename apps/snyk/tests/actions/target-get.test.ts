import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/target-get.ts";

test("target-get: fetches one target", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "t1" } } }], {
    display: { orgId: "org-1" },
  });
  await action.execute!({ targetId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/targets/t1");
});

test("target-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`targetId`");
  assertEquals(calls.length, 0);
});
