import { assert, assertEquals } from "@std/assert";
import webhookUnsubscribe from "../../actions/webhook-unsubscribe.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-unsubscribe: POST /api/v3/hooks/unsubscribe with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await webhookUnsubscribe.execute({ "targetUrl": "sample targetUrl" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/hooks/unsubscribe");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "target_url": "sample targetUrl" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("webhook-unsubscribe: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await webhookUnsubscribe.execute({ "targetUrl": "sample targetUrl" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("webhook-unsubscribe: is declared idempotent", () => {
  assertEquals(webhookUnsubscribe.idempotent, true);
});

Deno.test("webhook-unsubscribe: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await webhookUnsubscribe.execute({ "targetUrl": "sample targetUrl" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("webhook-unsubscribe: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await webhookUnsubscribe.execute({ "targetUrl": "sample targetUrl" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
