import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/organic-keyword-list.ts";
import { mockCtx } from "../_helpers.ts";

const input = { "target": "example.com", "date": "2026-10-01" };

Deno.test("organic-keyword-list: GETs /site-explorer/organic-keywords and returns the keywords with cost headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { keywords: [{ a: 1 }] },
    headers: {
      "content-type": "application/json",
      "x-api-units-cost-total-actual": "50",
      "x-api-rows": "1",
    },
  }]);
  const out = await action.execute!(input, ctx) as Record<string, unknown>;
  assertEquals(out.keywords, [{ a: 1 }]);
  assertEquals(out.unitsCost, 50);
  assertEquals(out.rows, 1);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.ahrefs.com/v3/site-explorer/organic-keywords");
  assertEquals(u.searchParams.get("target"), "example.com");
  assertEquals(u.searchParams.get("date"), "2026-10-01");
  assertEquals(
    u.searchParams.get("select"),
    "keyword,best_position,best_position_url,volume,keyword_difficulty,sum_traffic,cpc",
  );
});

Deno.test("organic-keyword-list: omits cost fields when headers are absent and passes optional params", async () => {
  const { ctx, calls } = mockCtx([{ body: { keywords: [{ a: 1 }] } }]);
  const out = await action.execute!({ ...input, limit: 5 }, ctx) as Record<string, unknown>;
  assertEquals("unitsCost" in out, false);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "5");
});

Deno.test("organic-keyword-list: a 403 array error body is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["Error", "Forbidden"] }]);
  await assertRejects(
    async () => await action.execute!(input, ctx),
    Error,
    "HTTP 403 — Error: Forbidden",
  );
});
