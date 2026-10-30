import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias.ts";

test("alias: posts userId + previousId to /alias", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ userId: "u1", previousId: "anon-1" }, ctx);
  assertEquals(calls[0].url, "https://api.segment.io/v1/alias");
  assertEquals(JSON.parse(calls[0].body!), { userId: "u1", previousId: "anon-1" });
  assertEquals(result, { success: true });
});

test("alias: previousId is optional per spec, though it's the field that gives a merge meaning", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ userId: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { userId: "u1" });
});

test("alias: rejects a blank userId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ userId: "  " }, ctx),
    Error,
    "`userId` is required",
  );
  assertEquals(calls.length, 0);
});
