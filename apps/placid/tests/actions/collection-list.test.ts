import { assertEquals } from "@std/assert";
import collectionList from "../../actions/collection-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("collection-list: no params sends no query; a bare array is folded too", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1" }] }]);
  const out = await collectionList.execute({}, ctx) as { data: unknown[] };
  assertEquals(out.data, [{ id: "c1" }]);
  assertEquals(pathOf(calls[0].url), "/collections");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("collection-list: per_page and cursor paginate", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "c1" }],
      links: { next: "https://api.placid.app/api/rest/collections?cursor=N2&per_page=5" },
      meta: { per_page: 5 },
    },
  }]);
  const out = await collectionList.execute({ per_page: 5, cursor: "N1" }, ctx) as {
    nextCursor: string;
  };
  assertEquals(out.nextCursor, "N2");
  assertEquals(queryOf(calls[0].url), { per_page: "5", cursor: "N1" });
});
