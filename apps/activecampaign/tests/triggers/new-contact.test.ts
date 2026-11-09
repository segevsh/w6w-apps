import assert from "node:assert/strict";
import test from "node:test";
import newContact from "../../triggers/new-contact.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";

test("new contact webhook replaces leftovers and stores the vendor id", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([
    { body: { webhooks: [{ id: "7", url: CALLBACK }] } },
    { body: {} },
    { body: { webhook: { id: "9" } } },
  ]);
  assert.deepEqual(await newContact.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx), {
    webhookId: "9",
  });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: "GET", url: "https://acme.api-us1.com/api/3/webhooks", body: null },
    { method: "DELETE", url: "https://acme.api-us1.com/api/3/webhooks/7", body: null },
    {
      method: "POST",
      url: "https://acme.api-us1.com/api/3/webhooks",
      body: JSON.stringify({
        webhook: {
          name: "w6w New Contact",
          url: CALLBACK,
          events: ["subscribe"],
          sources: ["admin", "api", "public", "system"],
        },
      }),
    },
  ]);
});

test("new contact webhook cleanup ignores a missing registration", async () => {
  const { ctx } = mockActiveCampaignCtx([{ status: 410, statusText: "Gone", body: {} }]);
  await newContact.onUnsubscribe!({ params: {}, state: { webhookId: "9" } }, ctx);
});

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

test("handleIngest parses a form-encoded delivery into the contact", async () => {
  const out = evs(
    await newContact.handleIngest!({
      raw: {
        method: "POST",
        body: "type=subscribe&contact[id]=42&contact[email]=ada%40example.com" +
          "&contact[first_name]=Ada&contact[last_name]=Lovelace&contact[fields][0]=x",
      },
    } as never),
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "42");
  assert.equal(out[0].email, "ada@example.com");
  assert.equal(out[0].firstName, "Ada");
  assert.equal(out[0].lastName, "Lovelace");
});

test("handleIngest refuses a non-POST delivery", async () => {
  await assert.rejects(
    async () => await newContact.handleIngest!({ raw: { method: "GET", body: "" } } as never),
    /POST/,
  );
});
