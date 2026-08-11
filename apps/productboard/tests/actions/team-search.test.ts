import { assertEquals } from "@std/assert";
import action from "../../actions/team-search.ts";
import { bodyOf, listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-search: POSTs filter and search", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "t-1" }]) }]);
  const filter = { fields: { handle: ["platform", "growth"] } };
  const out = await action.execute({ filter, query: "plat" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/teams/search");
  assertEquals(bodyOf(calls[0]), { data: { filter, search: { query: "plat" } } });
  assertEquals(out.items.length, 1);
});

/**
 * Teams search has no `return` key — its body schema is `additionalProperties:
 * false` over exactly `filter` and `search`, unlike the entity and note search
 * bodies. So no response-shaping param is offered.
 */
Deno.test("team-search: offers no return-fields param, because the body has no return key", () => {
  assertEquals(action.params?.map((p) => p.key), ["filter", "query", "pageCursor"]);
});
