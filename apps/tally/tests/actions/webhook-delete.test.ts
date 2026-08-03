import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: DELETEs the subscription and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ webhookId: "wh1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/webhooks/wh1");
  assertEquals(result, { webhookId: "wh1", deleted: true });
});
