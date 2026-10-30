import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createWebhook from "../../actions/create-webhook.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("create-webhook: USER_JOIN sends no filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1" } }]);
  await createWebhook.execute({ action: "USER_JOIN", url: "https://example.com/hook" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    action: { name: "USER_JOIN" },
    url: "https://example.com/hook",
  });
});

test("create-webhook: MENTION builds a filter with userSelection", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1" } }]);
  await createWebhook.execute(
    {
      action: "MENTION",
      url: "https://example.com/hook",
      mentionUserSelection: [{ id: "u1", type: "USER" }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, {
    name: "MENTION",
    filter: { userSelection: [{ id: "u1", type: "USER" }] },
  });
});

test("create-webhook: THREAD_CREATE builds a filter from its own params only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1" } }]);
  await createWebhook.execute(
    { action: "THREAD_CREATE", url: "https://example.com/hook", threadChannelID: "ch1" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.action, { name: "THREAD_CREATE", filter: { channelID: "ch1" } });
});

test("create-webhook: is not idempotent — no idempotency key is documented", () => {
  assertEquals(createWebhook.idempotent, false);
});
