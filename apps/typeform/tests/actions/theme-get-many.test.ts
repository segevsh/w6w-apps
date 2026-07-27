import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/theme-get-many.ts";

Deno.test("theme-get-many: GETs /themes with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], total_items: 0 } }]);
  await action.execute({ page: 2, pageSize: 30 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/themes");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "30");
});
