import { assertEquals } from "@std/assert";
import webhookCreate, { webhookBody } from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: events go in filter.event_type, never the deprecated top level", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1", name: "Hook" } }]);
  const out = await webhookCreate.execute({
    name: "Hook",
    url: "https://example.com/h",
    eventTypes: ["SMS_STATUS", "SMS_INBOUND"],
    statuses: '["DELIVERED"]' as unknown as string[],
    rateLimit: 10,
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/webhook");
  const body = bodyOf(calls[0]);
  assertEquals(body, {
    name: "Hook",
    url: "https://example.com/h",
    filter: { event_type: ["SMS_STATUS", "SMS_INBOUND"], status: ["DELIVERED"] },
    rate_limit: 10,
  });
  assertEquals("event_type" in body, false);
  assertEquals(out.id, "w1");
});

Deno.test("webhook-body: no filters means no filter object", () => {
  assertEquals(webhookBody({ name: "n", url: "u" }), { name: "n", url: "u" });
});

Deno.test("webhook-create: is not idempotent", () => assertEquals(webhookCreate.idempotent, false));
