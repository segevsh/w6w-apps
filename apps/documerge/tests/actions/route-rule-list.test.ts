import { assert, assertEquals, assertRejects } from "@std/assert";
import routeRuleList from "../../actions/route-rule-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("route-rule-list: GET /api/routes/{routeId}/rules", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await routeRuleList.execute({ "routeId": 13 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/routes/13/rules");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("route-rule-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(routeRuleList.execute({ "routeId": 13 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
