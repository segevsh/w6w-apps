import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

function entry(id: string, title: string, summary: string) {
  return { id, title, summary, summaryHtml: summary, publishedAt: "2026-01-01T00:00:00Z" };
}

Deno.test("service: ok when every latest entry is Resolved", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("1", "Ingestion degraded", "Resolved - fixed")],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: degraded when a latest entry is not Resolved", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("1", "Query pileup", "Investigating - looking into it")],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Query pileup");
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
