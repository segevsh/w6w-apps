import { assert, assertEquals, assertRejects } from "@std/assert";
import routeDeliveryMethodList from "../../actions/route-delivery-method-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-delivery-method-list: GET /api/routes/delivery-methods/{routeId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeDeliveryMethodList.execute({ "routeId": 13 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/routes/delivery-methods/13");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-delivery-method-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeDeliveryMethodList.execute({ "routeId": 13 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
