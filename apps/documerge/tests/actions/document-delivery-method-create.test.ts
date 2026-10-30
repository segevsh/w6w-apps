import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import documentDeliveryMethodCreate from "../../actions/document-delivery-method-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("document-delivery-method-create: POST /api/documents/delivery-methods/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentDeliveryMethodCreate.execute(
    {
      "documentId": 7,
      "type": "webhook",
      "settings": { "url": "https://example.com/hook" },
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/documents/delivery-methods/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "type": "webhook",
    "settings": { "url": "https://example.com/hook" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

test("document-delivery-method-create: settings given as a JSON string are parsed; a non-object is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await documentDeliveryMethodCreate.execute(
    {
      ...{ "documentId": 7, "type": "webhook", "settings": { "url": "https://example.com/hook" } },
      settings: '{"url":"https://e.com/h"}',
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).settings, { url: "https://e.com/h" });
  await assertRejects(
    () =>
      Promise.resolve(
        documentDeliveryMethodCreate.execute(
          {
            ...{
              "documentId": 7,
              "type": "webhook",
              "settings": { "url": "https://example.com/hook" },
            },
            settings: "[1]",
          } as never,
          ctx,
        ),
      ),
    Error,
    "JSON object",
  );
});

test("document-delivery-method-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentDeliveryMethodCreate.execute(
          {
            "documentId": 7,
            "type": "webhook",
            "settings": { "url": "https://example.com/hook" },
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

test("document-delivery-method-create: idempotency is declared as false", () =>
  assertEquals(documentDeliveryMethodCreate.idempotent, false));
