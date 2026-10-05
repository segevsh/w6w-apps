import { assertEquals, assertRejects } from "@std/assert";
import refundPolicyGet from "../../actions/refund-policy-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

Deno.test("refund-policy-get: sends GET /v2/refund_policy with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "refund_policy": { "id": "x1", "marker": true } },
  }]);
  await refundPolicyGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/refund_policy");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("refund-policy-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "refund_policy": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await refundPolicyGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("refund-policy-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(refundPolicyGet.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("refund-policy-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(refundPolicyGet.execute(INPUT, ctx)), Error, "refused");
});
