import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import webhookGet from "../../actions/webhook-get.ts";
import webhookCreate from "../../actions/webhook-create.ts";
import webhookUpdate from "../../actions/webhook-update.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

test("webhook-list: filter[store_id] survives", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await webhookList.execute({ storeId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter[store_id]"), "1");
});

test("webhook-get: GET /v1/webhooks/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "webhooks" }) }]);
  await webhookGet.execute({ webhookId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks/1");
});

test("webhook-create: POST with a store relationship and the events array", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "webhooks" }) }]);
  await webhookCreate.execute(
    {
      storeId: "1",
      url: "https://example.com/hook",
      events: ["order_created", "subscription_created"],
      secret: "shh",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.url, "https://example.com/hook");
  assertEquals(body.data.attributes.events, ["order_created", "subscription_created"]);
  assertEquals(body.data.attributes.secret, "shh");
  assertEquals(body.data.relationships.store, { data: { type: "stores", id: "1" } });
});

test("webhook-create: accepts a comma-separated events string too", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "webhooks" }) }]);
  await webhookCreate.execute(
    {
      storeId: "1",
      url: "https://example.com/hook",
      events: "order_created, order_refunded",
      secret: "shh",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.events, ["order_created", "order_refunded"]);
});

/** The secret is write-only per the vendor's docs — never expect it back, never re-echo it unasked. */
test("webhook-update: PATCH sends only the filled-in fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "webhooks" }) }]);
  await webhookUpdate.execute({ webhookId: "1", url: "https://new.example.com/hook" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes, { url: "https://new.example.com/hook" });
  assert(!("events" in body.data.attributes));
  assert(!("secret" in body.data.attributes));
});

test("webhook-delete: DELETE, reports deleted: true on the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await webhookDelete.execute({ webhookId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
