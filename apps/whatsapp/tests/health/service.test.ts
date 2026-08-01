import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: declares the metastatus.com WABA feed and no `check` beyond it", () => {
  assertEquals(service.kind, "service");
  assertEquals(
    service.feed?.url,
    "https://metastatus.com/outage-events-feed-whatsapp-business-api.rss",
  );
});

Deno.test("service: an empty feed (no open outage events) reports ok", async () => {
  const { ctx } = mockCtx();
  const report = await service.check!({
    feed: { entries: [], latest: [], fetchedAt: "2026-07-31T00:00:00Z" },
  }, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an open outage event reports degraded with its title", async () => {
  const { ctx } = mockCtx();
  const entry = {
    id: "1",
    title: "Elevated error rates on the Cloud API",
    summary: "We are investigating.",
    summaryHtml: "We are investigating.",
    publishedAt: "2026-07-31T00:00:00Z",
  };
  const report = await service.check!(
    { feed: { entries: [entry], latest: [entry], fetchedAt: "2026-07-31T00:05:00Z" } },
    ctx,
  );
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Elevated error rates on the Cloud API");
});

Deno.test("service: a feed fetch/parse failure reports unknown, never down", async () => {
  const { ctx } = mockCtx();
  const report = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "2026-07-31T00:00:00Z", error: "fetch failed" } },
    ctx,
  );
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "fetch failed");
});
