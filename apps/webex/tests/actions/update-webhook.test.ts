import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-webhook.ts";

Deno.test("update-webhook: PUTs /webhooks/{webhookId} and strips secret from the result", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", secret: "shh", status: "active" } }]);
  const result = await action.execute(
    { webhookId: "w1", name: "hook", targetUrl: "https://example.com/hook" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/webhooks/w1");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "hook",
    targetUrl: "https://example.com/hook",
  });
  assertEquals(result, { id: "w1", status: "active" });
});

Deno.test("update-webhook: reactivate sets status:active", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { webhookId: "w1", name: "n", targetUrl: "https://x", reactivate: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).status, "active");
});

Deno.test("update-webhook: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
