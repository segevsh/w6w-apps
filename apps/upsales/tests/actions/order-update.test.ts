import { assertEquals, assertRejects } from "@std/assert";
import orderUpdate from "../../actions/order-update.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("order-update: PUTs /orders/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await orderUpdate.execute({
    "id": 7,
    "description": "10 licenses",
    "date": "2018-07-23",
    "closeDate": "2018-08-01",
    "notes": "Net 30",
    "clientId": 2,
    "userId": 1,
    "contactId": 5,
    "stageId": 9,
    "probability": 25,
    "orderRows": [{ "quantity": 1, "price": 9000, "product": { "id": 1 } }],
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/orders/7`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "description": "10 licenses",
    "date": "2018-07-23",
    "closeDate": "2018-08-01",
    "notes": "Net 30",
    "client": { "id": 2 },
    "user": { "id": 1 },
    "contact": { "id": 5 },
    "stage": { "id": 9 },
    "probability": 25,
    "orderRow": [{ "quantity": 1, "price": 9000, "product": { "id": 1 } }],
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("order-update: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await orderUpdate.execute(
    {
      "id": 7,
      "description": "10 licenses",
      "fields": { "extraKey": { "a": 1 }, "description": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["description"], "10 licenses");
});

Deno.test("order-update: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await orderUpdate.execute(
    { "id": 7, "description": "10 licenses", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("order-update: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await orderUpdate.execute({ "id": 7, "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("order-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await orderUpdate.execute({ id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("order-update: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await orderUpdate.execute({
        "id": 7,
        "description": "10 licenses",
        "date": "2018-07-23",
        "closeDate": "2018-08-01",
        "notes": "Net 30",
        "clientId": 2,
        "userId": 1,
        "contactId": 5,
        "stageId": 9,
        "probability": 25,
        "orderRows": [{ "quantity": 1, "price": 9000, "product": { "id": 1 } }],
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("order-update: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await orderUpdate.execute({
        "id": 7,
        "description": "10 licenses",
        "date": "2018-07-23",
        "closeDate": "2018-08-01",
        "notes": "Net 30",
        "clientId": 2,
        "userId": 1,
        "contactId": 5,
        "stageId": 9,
        "probability": 25,
        "orderRows": [{ "quantity": 1, "price": 9000, "product": { "id": 1 } }],
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
