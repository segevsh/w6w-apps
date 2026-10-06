import { assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs and returns the vendor message", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Webhook deleted" } }]);
  const out = await webhookDelete.execute({ id: "w1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/webhook/w1");
  assertEquals(out, { id: "w1", message: "Webhook deleted" });
});

Deno.test("webhook-delete: an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "not found" } }]);
  await assertRejects(() => Promise.resolve(webhookDelete.execute({ id: "x" }, ctx)), Error, "404");
});

Deno.test("webhook-delete: is idempotent", () => assertEquals(webhookDelete.idempotent, true));
