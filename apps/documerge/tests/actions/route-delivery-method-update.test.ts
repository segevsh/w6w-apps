import { assert, assertEquals, assertRejects } from "@std/assert";
import routeDeliveryMethodUpdate from "../../actions/route-delivery-method-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-delivery-method-update: PUT /api/routes/delivery-methods/{routeId}/{deliveryMethodId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeDeliveryMethodUpdate.execute(
    {
      "routeId": 13,
      "deliveryMethodId": 5,
      "type": "webhook",
      "settings": { "url": "https://example.com/hook" },
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/routes/delivery-methods/13/5");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "type": "webhook",
    "settings": { "url": "https://example.com/hook" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("route-delivery-method-update: settings given as a JSON string are parsed; a non-object is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await routeDeliveryMethodUpdate.execute(
    {
      ...{
        "routeId": 13,
        "deliveryMethodId": 5,
        "type": "webhook",
        "settings": { "url": "https://example.com/hook" },
      },
      settings: '{"url":"https://e.com/h"}',
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).settings, { url: "https://e.com/h" });
  await assertRejects(
    () =>
      Promise.resolve(
        routeDeliveryMethodUpdate.execute(
          {
            ...{
              "routeId": 13,
              "deliveryMethodId": 5,
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

Deno.test("route-delivery-method-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeDeliveryMethodUpdate.execute(
          {
            "routeId": 13,
            "deliveryMethodId": 5,
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

Deno.test("route-delivery-method-update: idempotency is declared as true", () =>
  assertEquals(routeDeliveryMethodUpdate.idempotent, true));
