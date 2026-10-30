import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-webhook.ts";

test("update-webhook: PUTs /webhooks/{webhookId} and strips secret from the result", async () => {
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

test("update-webhook: reactivate sets status:active", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { webhookId: "w1", name: "n", targetUrl: "https://x", reactivate: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).status, "active");
});

test("update-webhook: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
