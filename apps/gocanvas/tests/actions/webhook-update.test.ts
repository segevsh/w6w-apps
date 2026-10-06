import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-update: PATCH /api/v3/forms/346127/webhooks/1 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "message": "Webhook has been updated successfully" },
  }]);
  const out = await action.execute(
    { "formId": 346127, "webhookId": 1, "pushUrl": "https://example.com/new" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks/1");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "push_url": "https://example.com/new" });
  assertEquals(out, { "message": "Webhook has been updated successfully" });
});
