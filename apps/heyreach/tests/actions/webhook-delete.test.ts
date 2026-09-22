import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: DELETE with the webhook id as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({ webhookId: 1234 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.heyreach.io/api/public/webhooks/DeleteWebhook?webhookId=1234",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: 200 });
});
