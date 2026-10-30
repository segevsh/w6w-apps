import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import routeList from "../../actions/route-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("route-list: GET /api/routes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeList.execute({} as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/routes");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

test("route-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeList.execute({} as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
