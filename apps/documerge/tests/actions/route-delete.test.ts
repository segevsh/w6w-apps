import { assert, assertEquals, assertRejects } from "@std/assert";
import routeDelete from "../../actions/route-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-delete: DELETE /api/routes/{routeId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await routeDelete.execute({ "routeId": 13 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/routes/13");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeDelete.execute({ "routeId": 13 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("route-delete: idempotency is declared as true", () =>
  assertEquals(routeDelete.idempotent, true));
