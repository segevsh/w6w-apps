import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

function entry(id: string, title: string) {
  return { id, title, summary: title, summaryHtml: title, publishedAt: "2026-01-01T00:00:00Z" };
}

Deno.test("service: declares an app-scoped, unsigned feed-backed check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://ghoststatus.org/history.rss");
});

Deno.test("service: ok when every latest entry reads as resolved/operational", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("1", "Degraded performance — Resolved")],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: degraded when a latest entry is still open", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [entry("1", "Image uploads failing")], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Image uploads failing");
});

Deno.test("service: unknown when the feed failed to fetch", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "now", error: "fetch failed" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
});

Deno.test("service: ok with no feed input at all (defensive default)", async () => {
  const out = await service.check!({}, mockCtx().ctx);
  assertEquals(out.state, "ok");
});
