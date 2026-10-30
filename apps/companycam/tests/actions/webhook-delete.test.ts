import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await webhookDelete.execute({ webhookId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhooks/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
