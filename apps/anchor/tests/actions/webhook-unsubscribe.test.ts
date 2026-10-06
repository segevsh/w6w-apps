import { assert, assertEquals } from "@std/assert";
import webhookUnsubscribe from "../../actions/webhook-unsubscribe.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-unsubscribe: sends DELETE /webhooks/subscriptions/w1", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await webhookUnsubscribe.execute({ "id": "w1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/webhooks/subscriptions/w1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
});

Deno.test("webhook-unsubscribe: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await webhookUnsubscribe.execute({ "id": "w1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
