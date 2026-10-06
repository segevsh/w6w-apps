import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /api/v3/forms/346127/webhooks/1 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await action.execute({ "formId": 346127, "webhookId": 1 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks/1");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1 });
});
