import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

function entry(title: string, summary: string) {
  return { id: title, title, summary, summaryHtml: summary, publishedAt: "2026-10-01T00:00:00Z" };
}
const run = (latest: ReturnType<typeof entry>[]) =>
  service.check!({ feed: { entries: [], latest, fetchedAt: "now" } }, mockCtx().ctx);

Deno.test("service: declares a service check on status.x.ai's RSS feed, with no network.allow", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://status.x.ai/feed.xml");
  assertEquals(service.network, undefined);
});

Deno.test("service: ok when every API incident is resolved", async () => {
  const out = await run([
    entry("[Global (api.x.ai)] Models outage", "Status: RESOLVED Severity: outage"),
  ]);
  assertEquals(out.state, "ok");
});

Deno.test("service: an open outage on the API component is down", async () => {
  const out = await run([
    entry("[US (us.api.x.ai)] Models outage", "Status: INVESTIGATING Severity: outage"),
  ]);
  assertEquals(out.state, "down");
});

Deno.test("service: an open non-outage API incident is degraded", async () => {
  const out = await run([
    entry("[Global (api.x.ai)] high error rate", "Status: MONITORING Severity: degraded"),
  ]);
  assertEquals(out.state, "degraded");
});

Deno.test("service: an open incident on grok.com or an app is ignored", async () => {
  const out = await run([
    entry("[grok.com] Models outage", "Status: INVESTIGATING Severity: outage"),
    entry("[Grok (iOS)] Models outage", "Status: INVESTIGATING Severity: outage"),
  ]);
  assertEquals(out.state, "ok");
});

Deno.test("service: unknown when the feed failed to fetch", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "now", error: "fetch failed" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
});
