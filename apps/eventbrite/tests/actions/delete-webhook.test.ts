import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-webhook.ts";

test("delete-webhook: DELETEs /webhooks/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ webhookId: "77" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/webhooks/77/");
  assertEquals(calls[0].body, null);
});
