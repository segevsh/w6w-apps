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

test("handleIngest yields the delivered body and refuses non-POST", async () => {
  const body = {
    id: 1,
    email: "ada@example.com",
    event: "list_addition",
    key: "xxxxxxxx",
    list_id: [8, 12],
    date: "2026-11-09 10:00:00",
    ts: 1794218400,
    api_key_name: "w6w",
  };
  const out = await newContact.handleIngest!({ raw: { method: "POST", body } } as never);
  assert.deepEqual(out, [body]);
  const [event] = out as Record<string, unknown>[];
  for (const field of newContact.output!) assert.ok(field.key in event, field.key);
  assert.deepEqual(newContact.output!.map((f) => f.key), [
    "event",
    "email",
    "list_id",
    "date",
    "ts",
  ]);
  assert.equal(event.event, "list_addition");
  assert.deepEqual(event.list_id, [8, 12]);
  assert.equal(event.ts, 1794218400);
  await assert.rejects(
    async () => await newContact.handleIngest!({ raw: { method: "GET" } } as never),
    /POST/,
  );
});
