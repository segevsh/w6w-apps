import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /v2/account/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Success" } }]);
  await webhookDelete.execute({ id: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/account/webhooks/w1");
});
