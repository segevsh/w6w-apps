import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

Deno.test("webhook-create: posts to the singular path with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { subscribeId: 1234 } }]);
  const result = await action.execute!({
    listId: 2,
    callbackUrl: "https://example.com/webhooks/lofty",
    limit: 100,
    permissionMode: 0,
  }, ctx) as { subscribeId: number };

  assertEquals(calls[0].method, "POST");
  // Registration is singular; listing is plural.
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/webhook");
  // permissionMode=0 is the documented default and still a value.
  assertEquals(JSON.parse(calls[0].body!), {
    listId: 2,
    callbackUrl: "https://example.com/webhooks/lofty",
    limit: 100,
    permissionMode: 0,
  });
  assertEquals(result.subscribeId, 1234);
});

Deno.test("webhook-create: only listId and callbackUrl are required", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { subscribeId: 1 } }]);
  await action.execute!({ listId: 2, callbackUrl: "https://example.com/h" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { listId: 2, callbackUrl: "https://example.com/h" });
});

/** Nothing deduplicates a subscription, so a retry creates a second delivery. */
Deno.test("webhook-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
