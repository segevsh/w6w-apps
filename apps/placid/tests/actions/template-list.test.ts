import { assertEquals } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-list: filters go in the query and the page is folded", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ uuid: "t1" }],
      links: { next: "https://api.placid.app/api/rest/templates?cursor=NEXT", prev: null },
      meta: { per_page: 20 },
    },
  }]);
  const out = await templateList.execute({
    collection_id: "c1",
    title_filter: "inv",
    tag: "social/instagram",
    order_by: "title-asc",
    cursor: "CUR",
  }, ctx);
  assertEquals(out, { data: [{ uuid: "t1" }], nextCursor: "NEXT", prevCursor: null, perPage: 20 });
  assertEquals(pathOf(calls[0].url), "/templates");
  assertEquals(queryOf(calls[0].url), {
    collection_id: "c1",
    title_filter: "inv",
    tag: "social/instagram",
    order_by: "title-asc",
    cursor: "CUR",
  });
});
