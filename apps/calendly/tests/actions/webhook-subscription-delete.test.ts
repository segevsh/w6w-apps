import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-subscription-delete.ts";

Deno.test("webhook-subscription-delete: DELETEs /webhook_subscriptions/{uuid} and returns deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute(
    { webhook: "https://api.calendly.com/webhook_subscriptions/FFFF" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/webhook_subscriptions/FFFF");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
