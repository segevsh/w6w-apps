import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /api/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await webhookDelete.execute({ webhook: 1 }, ctx) as { success: boolean };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/webhooks/1");
  assertEquals(out.success, true);
});
