import { assert, assertEquals } from "@std/assert";
import webhookSubscribe from "../../actions/webhook-subscribe.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-subscribe: POST /api/v3/hooks/subscribe with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await webhookSubscribe.execute({
    "targetUrl": "sample targetUrl",
    "event": "workspace_added",
    "workspaceId": 102,
    "channelId": 103,
    "threadId": 104,
    "conversationId": 105,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/hooks/subscribe");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "target_url": "sample targetUrl",
    "event": "workspace_added",
    "workspace_id": "102",
    "channel_id": "103",
    "thread_id": "104",
    "conversation_id": "105",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("webhook-subscribe: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await webhookSubscribe.execute({
    "targetUrl": "sample targetUrl",
    "event": "workspace_added",
    "workspaceId": 102,
    "channelId": 103,
    "threadId": 104,
    "conversationId": 105,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("webhook-subscribe: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await webhookSubscribe.execute(
    { "targetUrl": "sample targetUrl", "event": "workspace_added" },
    ctx,
  );

  assertEquals(formOf(calls[0].body), {
    "target_url": "sample targetUrl",
    "event": "workspace_added",
  });
});

Deno.test("webhook-subscribe: is declared non-idempotent", () => {
  assertEquals(webhookSubscribe.idempotent, false);
});

Deno.test("webhook-subscribe: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await webhookSubscribe.execute({
    "targetUrl": "sample targetUrl",
    "event": "workspace_added",
    "workspaceId": 102,
    "channelId": 103,
    "threadId": 104,
    "conversationId": 105,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("webhook-subscribe: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await webhookSubscribe.execute(
      { "targetUrl": "sample targetUrl", "event": "workspace_added" },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
