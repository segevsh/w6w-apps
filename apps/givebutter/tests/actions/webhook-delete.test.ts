import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await webhookDelete.execute({ id: "wh_1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wh_1");
  assertEquals(out, { status: 200 });
});
