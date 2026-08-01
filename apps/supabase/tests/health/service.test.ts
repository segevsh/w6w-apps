import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const entry = (title: string, summary: string, id = title) => ({
  id,
  title,
  summary,
  summaryHtml: summary,
  publishedAt: "2026-07-31T00:00:00Z",
});

Deno.test("service: no feed at all reports unknown", async () => {
  const { ctx } = mockCtx();
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a feed fetch/parse failure reports unknown, never down", async () => {
  const { ctx } = mockCtx();
  const report = await service.check!({
    feed: { entries: [], latest: [], fetchedAt: "2026-07-31T00:00:00Z", error: "fetch failed" },
  }, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "fetch failed");
});

Deno.test("service: an empty feed (nothing ever announced) is ok", async () => {
  const { ctx } = mockCtx();
  const report = await service.check!({
    feed: { entries: [], latest: [], fetchedAt: "2026-07-31T00:00:00Z" },
  }, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a resolved incident's newest entry is ok, not degraded", async () => {
  const { ctx } = mockCtx();
  const latest = [entry("Management API Degradation", "Resolved - the issue has been fixed.")];
  const report = await service.check!({
    feed: { entries: latest, latest, fetchedAt: "2026-07-31T00:00:00Z" },
  }, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an open incident (Investigating/Identified/Update) reports degraded", async () => {
  const { ctx } = mockCtx();
  const latest = [entry("Management API Degradation", "Update - still isolating the cause.")];
  const report = await service.check!({
    feed: { entries: latest, latest, fetchedAt: "2026-07-31T00:00:00Z" },
  }, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Management API Degradation");
});
