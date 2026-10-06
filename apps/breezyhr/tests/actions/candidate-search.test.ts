import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-search.ts";
import { mockCtx } from "../_helpers.ts";

type Rec = Record<string, unknown>;

Deno.test("candidate-search: POSTs the query and unwraps the paginated envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      total: 5,
      total_capped: false,
      page: 1,
      page_size: 1,
      next_page: 2,
      data: [{ _id: "k1" }],
    },
  }]);
  const out = await action.execute!(
    { companyId: "c1", query: '"product manager"', match: "exact", pageSize: 1 },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/candidates/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query: '"product manager"',
    match: "exact",
    page_size: 1,
  });
  assertEquals(out, { candidates: [{ _id: "k1" }], total: 5, totalCapped: false, nextPage: 2 });
});

Deno.test("candidate-search: a null next_page means no nextPage", async () => {
  const { ctx } = mockCtx([{ body: { total: 0, data: [], next_page: null } }]);
  const out = await action.execute!({ companyId: "c1", query: "x" }, ctx);
  assertEquals("nextPage" in (out as Rec), false);
  assertEquals((out as Rec).candidates, []);
});
