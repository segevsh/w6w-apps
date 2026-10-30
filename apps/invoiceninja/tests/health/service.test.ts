import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary = ""): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.invoiceninja.com/",
  publishedAt: "2026-09-05T00:00:00.000Z",
});

const feedInput = (partial: Partial<HealthFeedInput>): HealthFeedInput => ({
  entries: [],
  latest: [],
  fetchedAt: "2026-09-05T00:00:00.000Z",
  ...partial,
});

const run = (feed: HealthFeedInput | undefined) => {
  const { ctx } = mockCtx();
  return service.check!({ feed }, ctx);
};

test("service: is a feed-backed, unsigned, app-scoped check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.feed?.url, "https://status.invoiceninja.com/rss");
  assert(service.credential === undefined || service.credential === "none");
  assertEquals(service.network, undefined);
  assertEquals(service.unavailable, undefined);
});

test("service: no open incidents (an empty feed, as currently published) is ok", async () => {
  assertEquals((await run(feedInput({}))).state, "ok");
});

test("service: an open incident is degraded and names itself", async () => {
  const r = await run(feedInput({ latest: [entry("Delayed email delivery", "Investigating")] }));
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Delayed email delivery"));
});

test("service: a resolved incident does not report an outage that ended", async () => {
  const r = await run(
    feedInput({ latest: [entry("PDF generation degraded", "Resolved - fix deployed")] }),
  );
  assertEquals(r.state, "ok");
});

test("service: a mixed feed reports only what is still open", async () => {
  const r = await run(feedInput({
    latest: [
      entry("Old outage", "Resolved - all clear"),
      entry("Live outage", "Investigating - ongoing"),
    ],
  }));
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Live outage");
});

test("service: an unreadable feed is unknown, never down", async () => {
  assertEquals((await run(feedInput({ error: "502" }))).state, "unknown");
  assertEquals((await run(undefined)).state, "unknown");
});

test("service: the check makes no network call of its own", async () => {
  const { ctx, calls } = mockCtx();
  await service.check!({ feed: feedInput({}) }, ctx);
  assertEquals(calls.length, 0);
});
