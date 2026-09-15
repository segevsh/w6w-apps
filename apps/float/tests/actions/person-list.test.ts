import { assertEquals } from "@std/assert";
import personList from "../../actions/person-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("person-list - GETs /people with filters and reads pagination headers", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ people_id: 1, name: "Sarah-Jane Smith" }],
      headers: paginationHeaders({ "x-pagination-total-count": "3" }),
    },
  ]);
  const out = asListResult(await personList.execute({ active: "1", "per-page": 20, page: 1 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/people");
  assertEquals(queryOf(calls[0].url), { active: "1", "per-page": "20", page: "1" });
  assertEquals(out.items, [{ people_id: 1, name: "Sarah-Jane Smith" }]);
  assertEquals(out.pagination.totalCount, 3);
});

Deno.test("person-list - expand is comma-joined from an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [], headers: paginationHeaders() }]);
  await personList.execute({ expand: ["account", "managers"] }, ctx);
  assertEquals(queryOf(calls[0].url).expand, "account,managers");
});
