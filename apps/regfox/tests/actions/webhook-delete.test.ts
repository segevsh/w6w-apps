import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/webhook-delete.ts";
import { exec, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETE /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await exec(action, { webhookId: "4" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks/4");
  assertEquals(out, { deleted: true });
});
