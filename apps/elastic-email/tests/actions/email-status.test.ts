import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-status.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-status: GET /emails/{id}/status passes only the switched-on flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { ID: "t/1", Status: "Complete", DeliveredCount: 2 } }]);
  const out = await action.execute({
    transactionId: "t/1",
    showDelivered: true,
    showFailed: false,
  }, ctx) as { DeliveredCount: number };
  assertEquals(out.DeliveredCount, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v4/emails/t%2F1/status");
  assertEquals(queryOf(calls[0].url), { showDelivered: "true" });
});

Deno.test("email-status: requires a transaction id", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
