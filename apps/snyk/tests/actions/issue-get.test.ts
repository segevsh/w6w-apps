import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

const display = { orgId: "org-1" };

test("issue-get: fetches one issue", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "i1" } } }], { display });
  await action.execute!({ issueId: "i1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/issues/i1");
});

test("issue-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`issueId`");
  assertEquals(calls.length, 0);
});
