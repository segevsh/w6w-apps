import { assert, assertEquals, assertRejects } from "@std/assert";
import routeDeliveryMethodDelete from "../../actions/route-delivery-method-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-delivery-method-delete: DELETE /api/routes/delivery-methods/{routeId}/{deliveryMethodId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await routeDeliveryMethodDelete.execute(
    { "routeId": 13, "deliveryMethodId": 5 } as never,
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/routes/delivery-methods/13/5");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-delivery-method-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeDeliveryMethodDelete.execute({ "routeId": 13, "deliveryMethodId": 5 } as never, ctx),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-delivery-method-delete: idempotency is declared as true", () =>
  assertEquals(routeDeliveryMethodDelete.idempotent, true));
