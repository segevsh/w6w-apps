import { assertEquals } from "@std/assert";
import candidateSearch from "../../actions/candidate-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-search: POST /candidate/search with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await candidateSearch.execute(
    {
      "filters": '[{"key":"name","filter_type":"contains","value":"Ann"}]',
      "conjunction": "and",
      "itemsPerPage": 5,
      "currentPage": 1,
      "includeCount": true,
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/search");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "filters": [{ "key": "name", "filter_type": "contains", "value": "Ann" }],
    "conjunction": "and",
    "items_per_page": "5",
    "current_page": "1",
    "include_count": true,
  });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("candidate-search: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateSearch.execute(
      {
        "filters": '[{"key":"name","filter_type":"contains","value":"Ann"}]',
        "conjunction": "and",
        "itemsPerPage": 5,
        "currentPage": 1,
        "includeCount": true,
      } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
