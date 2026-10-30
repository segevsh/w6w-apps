import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await webhookDelete.execute({ id: "w1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w1");
  assertEquals(result, { status: 204 });
});
