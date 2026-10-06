import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import listWebhooks from "../../actions/list-webhooks.ts";

Deno.test("list-webhooks: GET /webhooks/v1/list wrapped as items", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "a", event: "booking_change", url: "https://x" }],
  }]);
  const out = await listWebhooks.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/webhooks/v1/list");
  assertEquals(out.items.length, 1);
});
