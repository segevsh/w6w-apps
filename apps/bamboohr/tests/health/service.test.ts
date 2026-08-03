import { assert, assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary = ""): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.bamboohr.com/",
  publishedAt: "2026-08-03T00:00:00.000Z",
});

/** A well-formed `input.feed`, so each test states only what it is varying. */
const feedInput = (partial: Partial<HealthFeedInput>): HealthFeedInput => ({
  entries: [],
  latest: [],
  fetchedAt: "2026-08-03T00:00:00.000Z",
  ...partial,
});

const run = (feed: HealthFeedInput | undefined) => {
  const { ctx } = mockCtx();
  return service.check!({ feed }, ctx);
};

Deno.test("service: is a feed-backed, unsigned, app-scoped check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(
    service.feed?.url,
    "https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss",
  );

  // The spec REQUIRES an unsigned posture for a feed-backed check: "A check
  // declaring `feed` MUST have `credential` of `none` or `context` — never
  // `signed`." `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");

  // The feed host is allowlisted implicitly, so restating it would be wrong —
  // and `status.bamboohr.com` must never reach the app's own egress allowlist.
  assertEquals(service.network, undefined);

  // A declared feed and a declared absence are mutually exclusive.
  assertEquals(service.unavailable, undefined);
});

Deno.test("service: no open incidents is ok", async () => {
  assertEquals((await run(feedInput({}))).state, "ok");
});

Deno.test("service: an open incident is degraded and names itself", async () => {
  const r = await run(
    feedInput({ latest: [entry("Background Processing is Delayed", "Investigating")] }),
  );
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Background Processing is Delayed"));
});

Deno.test("service: a resolved incident does not report an outage that ended", async () => {
  // The whole reason the RFC provides `latest`: status.io emits one item per
  // UPDATE, so the newest item of a resolved incident still carries the
  // incident's original title. Judging by the title alone would report an
  // outage days after it ended.
  for (const marker of ["Resolved", "Completed", "Monitoring"]) {
    const r = await run(
      feedInput({
        latest: [entry("Background Processing is Delayed", `Status: ${marker} - all clear`)],
      }),
    );
    assertEquals(r.state, "ok", `"${marker}" should not read as an open incident`);
  }
});

Deno.test("service: the resolved marker is matched in the title too", async () => {
  // status.io is not consistent about which field carries it, and a missed
  // "resolved" reads as a live outage — the expensive direction to be wrong in.
  const r = await run(feedInput({ latest: [entry("Resolved: API latency", "")] }));
  assertEquals(r.state, "ok");
});

Deno.test("service: a mixed feed reports only what is still open", async () => {
  const r = await run(feedInput({
    latest: [
      entry("Old outage", "Status: Resolved"),
      entry("Live outage", "Investigating"),
    ],
  }));
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Live outage");
});

Deno.test("service: an unreadable feed is unknown, never down", async () => {
  // A status feed that itself fails tells us nothing about the vendor.
  assertEquals((await run(feedInput({ error: "502" }))).state, "unknown");
  assertEquals((await run(undefined)).state, "unknown");
});

Deno.test("service: the check makes no network call of its own", async () => {
  // The host fetches and parses the feed; this app never reimplements a reader.
  const { ctx, calls } = mockCtx();
  await service.check!({ feed: feedInput({}) }, ctx);
  assertEquals(calls.length, 0);
});
