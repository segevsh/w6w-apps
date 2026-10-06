import { assert, assertEquals, assertRejects } from "@std/assert";
import routeFieldDelete from "../../actions/route-field-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-field-delete: DELETE /api/routes/fields/{routeId}/{fieldId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await routeFieldDelete.execute({ "routeId": 13, "fieldId": 21 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/routes/fields/13/21");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-field-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeFieldDelete.execute({ "routeId": 13, "fieldId": 21 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-field-delete: idempotency is declared as true", () =>
  assertEquals(routeFieldDelete.idempotent, true));
