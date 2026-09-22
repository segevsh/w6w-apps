import { assert, assertEquals } from "@std/assert";
import toolList from "../../actions/tool-list.ts";
import { mockRelevanceCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tool-list: GETs /studios/list with query, paging, filters and sort", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [{ studio_id: "s1" }] } }]);
  const out = await toolList.execute(
    {
      query: "search",
      page: 1,
      pageSize: 10,
      filters: [{ field: "public", filter_type: "exact_match", condition_value: true }],
      sort: [{ update_date_: "desc" }],
    },
    ctx,
  ) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/latest/studios/list");
  assertEquals(calls[0].method, "GET");
  const query = queryOf(calls[0].url);
  assertEquals(query.query, "search");
  assertEquals(query.page, "1");
  assertEquals(query.page_size, "10");
  assertEquals(JSON.parse(query.filters), [
    { field: "public", filter_type: "exact_match", condition_value: true },
  ]);
  assertEquals(JSON.parse(query.sort), [{ update_date_: "desc" }]);
  assertEquals(out.results.length, 1);
});

Deno.test("tool-list: no query at all when nothing is supplied", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await toolList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("tool-list: only `results` is declared, and openapi_schema is not requested", async () => {
  const output = toolList.output;
  assertEquals(Array.isArray(output) ? output.map((o) => o.key) : undefined, ["results"]);
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await toolList.execute({}, ctx);
  assertEquals("return_openapi_schema" in queryOf(calls[0].url), false);
  assert(toolList.type === "read");
});
