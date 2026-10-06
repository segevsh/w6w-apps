import { assert, assertEquals } from "@std/assert";
import webhookSubscribe from "../../actions/webhook-subscribe.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-subscribe: sends POST /webhooks/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "w1", "encryptionKey": "k" } }]);
  const out = await webhookSubscribe.execute(
    { "url": "https://example.com/hook", "events": ["invoice.paid", "proposal.*"] } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/webhooks/subscriptions");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "url": "https://example.com/hook",
    "events": ["invoice.paid", "proposal.*"],
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.id, "w1");
});

Deno.test("webhook-subscribe: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await webhookSubscribe.execute(
      { "url": "https://example.com/hook", "events": ["invoice.paid", "proposal.*"] } as never,
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
