import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/web-visit-search.ts";
import { mockCtx } from "../_helpers.ts";

interface Out {
  data: unknown;
  meta: { request_id: string };
  nextPage?: number;
  nextCursor?: string;
}

Deno.test("web-visit-search: sends POST to the documented path", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "x1" }],
      meta: { request_id: "r1", pagination: { next_cursor: "nc", page_num: 1, page_count: 3 } },
    },
  }]);
  const out = await action.execute!({
    "startDate": "2026-10-01",
    "endDate": "2026-10-05",
    "countryCodes": "DE",
    "page": 2,
    "accountId": "A1",
  }, ctx) as Out;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.leadfeeder.com/v1/web-visits?account_id=A1&page%5Bnum%5D=2",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "start_date": "2026-10-01",
    "end_date": "2026-10-05",
    "filters": { "location_country_codes": ["DE"] },
  });
  assertEquals(out.data, [{ id: "x1" }]);
  assertEquals(out.meta.request_id, "r1");
  assertEquals(out.nextPage, 2);
});

Deno.test("web-visit-search: a vendor error surfaces its code", async () => {
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
        "startDate": "2026-10-01",
        "endDate": "2026-10-05",
        "countryCodes": "DE",
        "page": 2,
        "accountId": "A1",
      }, ctx),
    Error,
    "HTTP 403 — insufficient_entitlements: Plan lacks access",
  );
});
