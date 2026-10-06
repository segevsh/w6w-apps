import { assert, assertEquals, assertRejects } from "@std/assert";
import routeFieldCreate from "../../actions/route-field-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-field-create: POST /api/routes/fields/{routeId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeFieldCreate.execute(
    { "routeId": 13, "name": "customer_name", "fieldMap": "Customer.Name" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/routes/fields/13");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "customer_name",
    "field_map": "Customer.Name",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("route-field-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeFieldCreate.execute(
          { "routeId": 13, "name": "customer_name", "fieldMap": "Customer.Name" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-field-create: idempotency is declared as false", () =>
  assertEquals(routeFieldCreate.idempotent, false));
