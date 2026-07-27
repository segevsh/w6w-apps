import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get-many.ts";

Deno.test("workspace-get-many: GETs /workspaces with search and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], total_items: 0 } }]);
  await action.execute({ search: "team", page: 1, pageSize: 20 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/workspaces");
  assertEquals(url.searchParams.get("search"), "team");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "20");
});
