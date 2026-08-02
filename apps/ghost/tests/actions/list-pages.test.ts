import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("list-pages: GETs /pages/ with default paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [{ id: "1" }] } }], { display });
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/ghost/api/admin/pages/");
  assertEquals(url.searchParams.get("limit"), "15");
  assertEquals(result.items, [{ id: "1" }]);
});
