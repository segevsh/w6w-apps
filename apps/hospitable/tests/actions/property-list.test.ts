import { assertEquals } from "@std/assert";
import propertyList from "../../actions/property-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("property-list: GET /v2/properties with include and paging; unset params stay out", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: { total: 0 } } }]);
  await propertyList.execute({ include: "listings,owners", page: 2, per_page: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/properties");
  assertEquals(queryOf(calls[0].url), { include: "listings,owners", page: "2", per_page: "5" });
  const bare = mockCtx([{ body: { data: [] } }]);
  await propertyList.execute({}, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {});
  assertEquals(propertyList.type, "search");
});
