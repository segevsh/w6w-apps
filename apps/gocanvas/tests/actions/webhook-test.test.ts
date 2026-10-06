import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-test.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-test: POST /api/v3/forms/346127/webhooks/1/test with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "message": "Test webhook sent successfully", "response_code": 200 },
  }]);
  const out = await action.execute({ "formId": 346127, "webhookId": 1 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks/1/test");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "message": "Test webhook sent successfully", "response_code": 200 });
});
