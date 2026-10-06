import { assert, assertEquals, assertRejects } from "@std/assert";
import routeGet from "../../actions/route-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-get: GET /api/routes/{routeId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeGet.execute({ "routeId": 13 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/routes/13");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeGet.execute({ "routeId": 13 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
