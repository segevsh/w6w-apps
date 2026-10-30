import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /api/account/webhooks with the URL list and type", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  await webhookDelete.execute({ urls: ["https://example.com/hook"], type: "receive" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
  assertEquals(jsonBodyOf(calls[0]), { webhooks: ["https://example.com/hook"], type: "receive" });
});
