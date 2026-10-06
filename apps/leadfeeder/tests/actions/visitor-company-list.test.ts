import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/visitor-company-list.ts";
import { mockCtx } from "../_helpers.ts";

interface Out {
  data: unknown;
  meta: { request_id: string };
  nextPage?: number;
  nextCursor?: string;
}

Deno.test("visitor-company-list: sends GET to the documented path", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "x1" }],
      meta: { request_id: "r1", pagination: { next_cursor: "nc", page_num: 1, page_count: 3 } },
    },
  }]);
  const out = await action.execute!({
    "startDate": "2026-10-01",
    "endDate": "2026-10-05",
    "customFeedId": "f1",
    "accountId": "A1",
  }, ctx) as Out;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.leadfeeder.com/v1/web-visits/companies?account_id=A1&start_date=2026-10-01&end_date=2026-10-05&custom_feed_id=f1",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out.data, [{ id: "x1" }]);
  assertEquals(out.meta.request_id, "r1");
  assertEquals(out.nextPage, 2);
});

Deno.test("visitor-company-list: a vendor error surfaces its code", async () => {
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
        "customFeedId": "f1",
        "accountId": "A1",
      }, ctx),
    Error,
    "HTTP 403 — insufficient_entitlements: Plan lacks access",
  );
});
