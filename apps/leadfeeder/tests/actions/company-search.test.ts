import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-search.ts";
import { mockCtx } from "../_helpers.ts";

interface Out {
  data: unknown;
  meta: { request_id: string };
  nextPage?: number;
  nextCursor?: string;
}

Deno.test("company-search: sends POST to the documented path", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "x1" }],
      meta: { request_id: "r1", pagination: { next_cursor: "nc", page_num: 1, page_count: 3 } },
    },
  }]);
  const out = await action.execute!({
    "searchTerms": "acme, globex",
    "revenueMin": 100,
    "cursor": "cur1",
    "pageSize": 5,
    "accountId": "A1",
  }, ctx) as Out;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.leadfeeder.com/v1/companies/search?account_id=A1&page%5Bcursor%5D=cur1&page%5Bsize%5D=5",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "search_terms": ["acme", "globex"],
    "revenue": { "min": 100 },
  });
  assertEquals(out.data, [{ id: "x1" }]);
  assertEquals(out.meta.request_id, "r1");
  assertEquals(out.nextCursor, "nc");
});

Deno.test("company-search: a vendor error surfaces its code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      errors: [{ code: "insufficient_entitlements", title: "Plan lacks access" }],
      meta: { request_id: "r2" },
    },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "searchTerms": "acme, globex",
        "revenueMin": 100,
        "cursor": "cur1",
        "pageSize": 5,
        "accountId": "A1",
      }, ctx),
    Error,
    "HTTP 403 — insufficient_entitlements: Plan lacks access",
  );
});
