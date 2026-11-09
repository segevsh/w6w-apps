import assert from "node:assert/strict";
import test from "node:test";
import newListEntry from "../../triggers/new-list-entry.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";

test("new list entry webhook replaces its callback registration", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 7, webhook_url: CALLBACK }] },
    { body: { success: true } },
    { body: { id: 9 } },
  ]);
  assert.deepEqual(await newListEntry.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx), {
    webhookId: "9",
  });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: "GET", url: "https://api.affinity.co/webhook", body: null },
    { method: "DELETE", url: "https://api.affinity.co/webhook/7", body: null },
    {
      method: "POST",
      url: "https://api.affinity.co/webhook/subscribe",
      body: JSON.stringify({ webhook_url: CALLBACK, subscriptions: ["list_entry.created"] }),
    },
  ]);
});

test("new list entry webhook cleanup ignores an already-gone registration", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "Unknown API endpoint" }]);
  await newListEntry.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, ctx);
});

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

test("handleIngest yields the delivered body and refuses non-POST", async () => {
  const body = { type: "list_entry.created", body: { id: 3, list_id: 1 } };
  assert.deepEqual(await newListEntry.handleIngest!({ raw: { method: "POST", body } } as never), [
    body,
  ]);
  await assert.rejects(
    async () => await newListEntry.handleIngest!({ raw: { method: "GET" } } as never),
    /POST/,
  );
});
