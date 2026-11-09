import assert from "node:assert/strict";
import test from "node:test";
import newDeal from "../../triggers/new-deal.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";

test("onSubscribe removes a leftover callback registration then creates the deal webhook", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, data: [{ id: 7, subscription_url: CALLBACK }] } },
    { body: { success: true, data: {} } },
    { body: { success: true, data: { id: 9 } } },
  ]);

  const state = await newDeal.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx);

  assert.deepEqual(state, { webhookId: "9" });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: "GET", url: "https://api.pipedrive.com/v1/webhooks", body: null },
    { method: "DELETE", url: "https://api.pipedrive.com/v1/webhooks/7", body: null },
    {
      method: "POST",
      url: "https://api.pipedrive.com/v1/webhooks",
      body: JSON.stringify({
        subscription_url: CALLBACK,
        event_action: "create",
        event_object: "deal",
        name: "w6w New Deal",
      }),
    },
  ]);
});

test("onUnsubscribe treats Pipedrive 404 as already gone", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, statusText: "Not Found", body: {} }]);
  await newDeal.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, ctx);
  assert.deepEqual(calls.map(({ method, url }) => ({ method, url })), [
    { method: "DELETE", url: "https://api.pipedrive.com/v1/webhooks/9" },
  ]);
});

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

test("handleIngest yields the current deal and refuses non-POST", async () => {
  const out = evs(
    await newDeal.handleIngest!({
      raw: { method: "POST", body: { current: { id: 5, title: "Big" }, previous: null } },
    } as never),
  );
  assert.deepEqual(out, [{ id: 5, title: "Big" }]);
  await assert.rejects(
    async () => await newDeal.handleIngest!({ raw: { method: "GET" } } as never),
    /POST/,
  );
});
