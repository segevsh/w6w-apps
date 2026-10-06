import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /api/v3/forms/346127/webhooks with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 2 } }]);
  const out = await action.execute(
    {
      "formId": 346127,
      "eventType": "submission_create",
      "format": "xml",
      "pushUrl": "https://example.com/hook",
      "pushTag": "t",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/forms/346127/webhooks");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "event_type": "submission_create",
    "format": "xml",
    "push_url": "https://example.com/hook",
    "push_tag": "t",
  });
  assertEquals(out, { "id": 2 });
});
