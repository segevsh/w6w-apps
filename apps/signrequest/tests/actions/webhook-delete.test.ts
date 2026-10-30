import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /webhooks/{id}/ and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ webhookId: "wh-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/api/v1/webhooks/wh-1/");
  assertEquals(out, { deleted: true });
});
