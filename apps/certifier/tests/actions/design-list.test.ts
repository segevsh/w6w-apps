import { assertEquals } from "@std/assert";
import action from "../../actions/design-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("design-list: GET /v1/designs with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "d1", type: "badge" }]) }]);
  const out = await action.execute({ limit: 20 }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/designs");
  assertEquals(queryOf(calls[0].url), { limit: "20" });
  assertEquals(out.data.length, 1);
});
