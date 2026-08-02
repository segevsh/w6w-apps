import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";

const entry = (over: Partial<HealthFeedEntry>): HealthFeedEntry => ({
  title: "x",
  summary: "",
  summaryHtml: "",
  ...over,
});

const feed = (latest: HealthFeedEntry[]): HealthFeedInput => ({
  entries: latest,
  latest,
  fetchedAt: new Date().toISOString(),
});

Deno.test("service: no open incidents reports ok", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    { feed: feed([entry({ title: "gohighlevel.com recovered" })]) },
    ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: a whole-platform outage maps to down", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    { feed: feed([entry({ title: "gohighlevel.com went down" })]) },
    ctx,
  );
  assertEquals(out.state, "down");
});

Deno.test("service: an open, feature-scoped incident maps to degraded", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    {
      feed: feed([
        entry({
          title: "Social Planner: YouTube Integration (Partial)",
          summary: "We are currently experiencing an issue affecting some YouTube features.",
        }),
      ]),
    },
    ctx,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Social Planner: YouTube Integration (Partial)");
});

Deno.test("service: a resolved incident (by description) does not count as open", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    {
      feed: feed([
        entry({
          title: "Social Planner: YouTube Integration (Partial)",
          summary: "The issue has been resolved, and all services are operating normally.",
        }),
      ]),
    },
    ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: a feed fetch error reports unknown, never down", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!({ feed: { ...feed([]), error: "fetch failed" } }, ctx);
  assertEquals(out.state, "unknown");
});
