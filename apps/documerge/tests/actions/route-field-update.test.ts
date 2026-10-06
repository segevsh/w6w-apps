import { assert, assertEquals, assertRejects } from "@std/assert";
import routeFieldUpdate from "../../actions/route-field-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-field-update: PUT /api/routes/fields/{routeId}/{fieldId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeFieldUpdate.execute(
    { "routeId": 13, "fieldId": 21, "name": "customer_name", "fieldMap": "Customer.Name" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/routes/fields/13/21");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "customer_name",
    "field_map": "Customer.Name",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("route-field-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        routeFieldUpdate.execute(
          {
            "routeId": 13,
            "fieldId": 21,
            "name": "customer_name",
            "fieldMap": "Customer.Name",
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-field-update: idempotency is declared as true", () =>
  assertEquals(routeFieldUpdate.idempotent, true));
