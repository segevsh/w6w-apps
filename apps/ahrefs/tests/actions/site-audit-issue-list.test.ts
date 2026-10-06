import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/site-audit-issue-list.ts";
import { mockCtx } from "../_helpers.ts";

const input = { "projectId": 12 };

Deno.test("site-audit-issue-list: GETs /site-audit/issues and returns the issues with cost headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { issues: [{ a: 1 }] },
    headers: {
      "content-type": "application/json",
      "x-api-units-cost-total-actual": "50",
      "x-api-rows": "1",
    },
  }]);
  const out = await action.execute!(input, ctx) as Record<string, unknown>;
  assertEquals(out.issues, [{ a: 1 }]);
  assertEquals(out.unitsCost, 50);
  assertEquals(out.rows, 1);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.ahrefs.com/v3/site-audit/issues");
  assertEquals(u.searchParams.get("project_id"), "12");
});

Deno.test("site-audit-issue-list: omits cost fields when headers are absent and passes optional params", async () => {
  const { ctx, calls } = mockCtx([{ body: { issues: [{ a: 1 }] } }]);
  const out = await action.execute!({ ...input }, ctx) as Record<string, unknown>;
  assertEquals("unitsCost" in out, false);
  assertEquals(calls.length, 1);
});

Deno.test("site-audit-issue-list: a 403 array error body is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["Error", "Forbidden"] }]);
  await assertRejects(
    async () => await action.execute!(input, ctx),
    Error,
    "HTTP 403 — Error: Forbidden",
  );
});
