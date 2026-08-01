import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with plenty of headroom", async () => {
  const { ctx } = mockCtx([{ body: { character_count: 100, character_limit: 500000 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].id, "characters");
  assertEquals(report.quota?.[0].remaining, 499900);
});

Deno.test("quota: reports degraded under 10% headroom", async () => {
  const { ctx } = mockCtx([{ body: { character_count: 95000, character_limit: 100000 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports down when remaining is exhausted", async () => {
  const { ctx } = mockCtx([{ body: { character_count: 100000, character_limit: 100000 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: also reports a documents bucket when the account has a document cap", async () => {
  const { ctx } = mockCtx([{
    body: { character_count: 0, character_limit: 100, document_count: 9, document_limit: 10 },
  }]);
  const report = await quota.check!({}, ctx);
  const doc = report.quota?.find((q) => q.id === "documents");
  assertEquals(doc?.remaining, 1);
});

Deno.test("quota: unknown on a network/HTTP failure, never a crash", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "boom" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: severity is informational so it never gates a roll-up", () => {
  assertEquals(quota.severity, "informational");
});
