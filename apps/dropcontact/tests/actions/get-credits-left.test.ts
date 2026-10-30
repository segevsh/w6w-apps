import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import credits from "../../actions/get-credits-left.ts";
import { mockCtx, run } from "../_helpers.ts";

test("get-credits-left: posts one empty contact and returns credits_left", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, success: true, request_id: "r", credits_left: 123 },
  }]);
  const out = await run(credits, {}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{}] });
  assertEquals(out.creditsLeft, 123);
});

test("get-credits-left: 403 quota exceeded throws", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: true, reason: "Token exceeded quota" } }]);
  await assertRejects(() => run(credits, {}, ctx), Error, "Token exceeded quota");
});
