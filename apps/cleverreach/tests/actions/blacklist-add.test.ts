import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/blacklist-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("blacklist-add: POSTs the entry", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ email: "ras@guhl.org", comment: "not to talk about" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/blacklist");
  assertEquals(JSON.parse(calls[0].body!), { email: "ras@guhl.org", comment: "not to talk about" });
});

test("blacklist-add: requires an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ comment: "x" }, ctx),
    Error,
    "`email` is required",
  );
  assertEquals(calls.length, 0);
});
