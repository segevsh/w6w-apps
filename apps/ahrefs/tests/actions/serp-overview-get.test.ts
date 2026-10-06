import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/serp-overview-get.ts";
import { mockCtx } from "../_helpers.ts";

const input = { "keyword": "seo", "country": "US" };

Deno.test("serp-overview-get: GETs /serp-overview/serp-overview and returns the positions with cost headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { positions: [{ a: 1 }] },
    headers: {
      "content-type": "application/json",
      "x-api-units-cost-total-actual": "50",
      "x-api-rows": "1",
    },
  }]);
  const out = await action.execute!(input, ctx) as Record<string, unknown>;
  assertEquals(out.positions, [{ a: 1 }]);
  assertEquals(out.unitsCost, 50);
  assertEquals(out.rows, 1);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.ahrefs.com/v3/serp-overview/serp-overview");
  assertEquals(u.searchParams.get("keyword"), "seo");
  assertEquals(u.searchParams.get("country"), "us");
  assertEquals(
    u.searchParams.get("select"),
    "position,url,title,type,domain_rating,url_rating,backlinks,refdomains,traffic,value",
  );
});

Deno.test("serp-overview-get: omits cost fields when headers are absent and passes optional params", async () => {
  const { ctx, calls } = mockCtx([{ body: { positions: [{ a: 1 }] } }]);
  const out = await action.execute!({ ...input }, ctx) as Record<string, unknown>;
  assertEquals("unitsCost" in out, false);
  assertEquals(calls.length, 1);
});

Deno.test("serp-overview-get: a 403 array error body is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["Error", "Forbidden"] }]);
  await assertRejects(
    async () => await action.execute!(input, ctx),
    Error,
    "HTTP 403 — Error: Forbidden",
  );
});
