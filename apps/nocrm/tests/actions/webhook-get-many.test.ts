import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/webhook-get-many.ts";

Deno.test("webhook-get-many: GETs /webhooks with no parameters", async () => {
  const { ctx, calls } = mockNocrmCtx([{
    body: [{ id: 62, event: "lead.content_has_changed", is_disabled: true }],
  }]);
  const page = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/webhooks");
  assertEquals(page.items, [{ id: 62, event: "lead.content_has_changed", is_disabled: true }]);
});

Deno.test("webhook-get-many: the endpoint's own not_api_key refusal is surfaced", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 401,
    body: { error: 401, message: "Not an api key", type: "not_api_key" },
  }]);
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "not_api_key");
});
