import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf, v3Envelope } from "../_helpers.ts";

test("webhook-delete: DELETEs and reads the 200 body the vendor returns", async () => {
  // This delete answers 200 WITH a body, not the usual 204.
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 1, scope: "store/order/created" }) }]);
  const out = await webhookDelete.execute({ webhookId: 1 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/hooks/1");
  assertEquals(out, { id: 1, scope: "store/order/created" });
});

test("webhook-delete: re-deleting cannot do something different", () => {
  assertEquals(webhookDelete.idempotent, true);
});
