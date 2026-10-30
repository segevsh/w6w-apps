import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import deleteWebhook from "../../actions/delete-webhook.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("delete-webhook: DELETEs /webhooks with key/url in the body, not the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await deleteWebhook.execute(
    { key: "review/created", url: "https://example.com/hook" },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    key: "review/created",
    url: "https://example.com/hook",
  });
  assertEquals(out, { ok: true });
});

test("delete-webhook: is marked idempotent — deleting an already-gone subscription is a no-op", () => {
  assertEquals(deleteWebhook.idempotent, true);
});
