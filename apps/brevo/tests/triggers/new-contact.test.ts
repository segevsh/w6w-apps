import assert from "node:assert/strict";
import test from "node:test";
import newContact from "../../triggers/new-contact.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";

test("new contact webhook replaces an existing callback registration", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [{ id: 7, url: CALLBACK }] } },
    { status: 204 },
    { body: { id: 9 } },
  ]);
  assert.deepEqual(await newContact.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx), {
    webhookId: "9",
  });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: "GET", url: "https://api.brevo.com/v3/webhooks", body: null },
    { method: "DELETE", url: "https://api.brevo.com/v3/webhooks/7", body: null },
    {
      method: "POST",
      url: "https://api.brevo.com/v3/webhooks",
      body: JSON.stringify({
        url: CALLBACK,
        description: "w6w New Contact",
        events: ["listAddition"],
        type: "marketing",
      }),
    },
  ]);
});

test("new contact webhook cleanup treats Brevo 404 as already gone", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: {} }]);
  await newContact.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, ctx);
});

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

test("handleIngest yields the delivered body and refuses non-POST", async () => {
  const body = { event: "contact_added", email: "ada@example.com", id: 9 };
  assert.deepEqual(await newContact.handleIngest!({ raw: { method: "POST", body } } as never), [
    body,
  ]);
  await assert.rejects(
    async () => await newContact.handleIngest!({ raw: { method: "GET" } } as never),
    /POST/,
  );
});
