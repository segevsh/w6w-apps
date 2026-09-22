import { assertEquals } from "@std/assert";
import listList from "../../actions/list-list.ts";
import { mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("list-list: GETs /lists and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Newsletter" }]) }]);
  const out = await listList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendfox.com/lists");
  assertEquals(out.data.length, 1);
});

Deno.test("list-list: a search string is passed as the query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await listList.execute({ query: "news" }, ctx);
  assertEquals(queryOf(calls[0].url), { query: "news" });
});
