import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhooksDelete from "../../actions/webhooks-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

test("webhooks-delete: DELETEs /webhook/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await webhooksDelete.execute({ webhookSubscriptionId: 1234 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhook/1234");
  assertEquals(out, { success: true });
});
