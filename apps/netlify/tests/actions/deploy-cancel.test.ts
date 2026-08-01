import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-cancel.ts";

Deno.test("deploy-cancel: POSTs /deploys/{id}/cancel, not site-scoped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "deploy1", state: "cancelled" } }]);
  const result = await action.execute!({ deployId: "deploy1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.netlify.com/api/v1/deploys/deploy1/cancel");
  assertEquals(result, { id: "deploy1", state: "cancelled" });
});

Deno.test("deploy-cancel: requires deployId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "deployId");
});

Deno.test("deploy-cancel: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
