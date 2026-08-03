import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-update.ts";

Deno.test("webhook-update: PATCHes the full documented body and handles the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({
    webhookId: "wh1",
    formId: "f1",
    url: "https://x.test",
    isEnabled: false,
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/webhooks/wh1");
  // formId, url, eventTypes and isEnabled are all required by the API.
  assertEquals(jsonBody(calls[0]), {
    formId: "f1",
    url: "https://x.test",
    isEnabled: false,
    eventTypes: ["FORM_RESPONSE"],
  });
  assertEquals(result, { webhookId: "wh1", updated: true });
});

Deno.test("webhook-update: marks the API's four required fields required", () => {
  const required = action.params?.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["webhookId", "formId", "url", "isEnabled"]);
});
