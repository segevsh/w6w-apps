import { assertEquals, assertRejects } from "@std/assert";
import refundPolicyUpdate from "../../actions/refund-policy-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "refundPeriod": "none", "finePrint": "finePrint-1" };

Deno.test("refund-policy-update: sends PUT /v2/refund_policy with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "refund_policy": { "id": "x1", "marker": true } },
  }]);
  await refundPolicyUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/refund_policy");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["refund_period", "none"], [
    "fine_print",
    "finePrint-1",
  ]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("refund-policy-update: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "refund_policy": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await refundPolicyUpdate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("refund-policy-update: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(refundPolicyUpdate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("refund-policy-update: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(refundPolicyUpdate.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
