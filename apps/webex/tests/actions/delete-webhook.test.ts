import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-webhook.ts";

Deno.test("delete-webhook: DELETEs /webhooks/{webhookId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ webhookId: "w1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/webhooks/w1");
  assertEquals(result, { deleted: true });
});
