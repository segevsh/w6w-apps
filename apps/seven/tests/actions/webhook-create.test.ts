import { assert, assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "target_url": "https://acme.inc/webhook/sms",
  "event_type": "sms_mo",
  "event_filter": "4915112345678",
  "request_method": "JSON",
} as Parameters<typeof webhookCreate.execute>[0];

Deno.test("webhook-create: POST /api/hooks with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "code": null, "id": 12345, "error_message": null },
  }]);
  const out = await webhookCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/hooks");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "target_url": "https://acme.inc/webhook/sms",
    "event_type": "sms_mo",
    "request_method": "JSON",
    "event_filter": "4915112345678",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.id, 12345);
});

Deno.test("webhook-create: declares type perform and every required param", () => {
  const required = (webhookCreate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["event_type", "target_url"]);
  assert(["read", "search", "perform"].includes(webhookCreate.type));
  assertEquals(webhookCreate.type, "perform");
});

Deno.test("webhook-create: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await webhookCreate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});

Deno.test("webhook-create: event_filter is dropped for any event other than sms_mo", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, id: 1 } }]);
  await webhookCreate.execute({
    target_url: "https://acme.inc/h",
    event_type: "dlr",
    event_filter: "4915112345678",
  }, ctx);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    target_url: "https://acme.inc/h",
    event_type: "dlr",
  });
});

Deno.test("webhook-create: success false is thrown with the vendor's error_message", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error_message: "invalid target" } }]);
  let message = "";
  try {
    await webhookCreate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("invalid target"), message);
});
