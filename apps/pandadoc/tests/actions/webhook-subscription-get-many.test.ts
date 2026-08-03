import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/webhook-subscription-get-many.ts";

Deno.test("webhook-subscription-get-many: GETs /webhook-subscriptions", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{
        uuid: "w1",
        name: "prod",
        url: "https://example.com/hook",
        status: "ACTIVE",
        triggers: ["document_state_changed"],
      }],
    },
  }]);
  const out = await action.execute({}, ctx) as { items: Array<{ uuid: string }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/webhook-subscriptions");
  assertEquals(new URL(calls[0].url).search, "");
  // This endpoint answers `items`, not `results` — the vendor's inconsistency.
  assertEquals(out.items[0].uuid, "w1");
});

Deno.test("webhook-subscription-get-many: declares `items` as its output key", () => {
  assertEquals((action.output as Array<{ key: string }>)[0].key, "items");
});

Deno.test("webhook-subscription-get-many: takes no params and is read-only", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "search");
  assertEquals(action.resource, "webhook");
});
