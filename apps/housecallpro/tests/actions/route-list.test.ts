import { assertEquals } from "@std/assert";
import routeList from "../../actions/route-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("route-list: sends per_page, not page_size", async () => {
  const { ctx, calls } = mockCtx([
    { body: { routes: [{ id: "r1" }], total_items: 1, total_pages: 1, page: 1, page_size: 50 } },
  ]);
  const out = await routeList.execute({ date: "2026-03-23", page: 1, perPage: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/routes");
  assertEquals(queryOf(calls[0].url), { date: "2026-03-23", page: "1", per_page: "50" });
  // The one list endpoint that would silently ignore `page_size`.
  assertEquals("page_size" in queryOf(calls[0].url), false);
  assertEquals(out.items, [{ id: "r1" }]);
});

Deno.test("route-list: exposes perPage rather than the shared pageSize fragment", () => {
  const keys = (routeList.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("perPage"), true);
  assertEquals(keys.includes("pageSize"), false);
});
