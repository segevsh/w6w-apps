import { assert, assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service, { isOpenIncident, isOtherRegion } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary: string): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.gocanvas.com/incidents/x",
  publishedAt: "2026-09-20T08:50:00.000Z",
});

const feedInput = (latest: HealthFeedEntry[]): HealthFeedInput => ({
  entries: latest,
  latest,
  fetchedAt: "2026-10-06T00:00:00.000Z",
});

const run = (feed: HealthFeedInput | undefined) => service.check!({ feed }, mockCtx().ctx);

Deno.test("service: is a feed-backed, unsigned, app-scoped check on the vendor's own host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://status.gocanvas.com/incidents.atom");
  assert(service.credential === undefined || service.credential === "none");
  assertEquals(service.network, undefined);
  assertEquals(service.unavailable, undefined);
});

Deno.test("service: resolved incidents and completed maintenance are ok", async () => {
  const r = await run(feedInput([
    entry(
      "US - Scheduled infrastructure maintenance",
      "2026-09-20 08:50:00 UTC Operational [Maintenance complete] Maintenance is complete.",
    ),
    entry("US - Missing Tasks", "2026-04-29 21:45:00 UTC Operational [Resolved] Resolved."),
  ]));
  assertEquals(r.state, "ok");
});

Deno.test("service: an open US incident is degraded and names itself", async () => {
  const r = await run(feedInput([
    entry(
      "US - Server under heavy load",
      "2026-10-06 10:00:00 UTC Problem detected [Investigating]",
    ),
  ]));
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("US - Server under heavy load"));
});

Deno.test("service: planned maintenance in progress is degraded", async () => {
  const r = await run(feedInput([
    entry("US - Scheduled infrastructure maintenance", "Degraded performance [In maintenance] x"),
  ]));
  assertEquals(r.state, "degraded");
});

Deno.test("service: an open EU or AU incident does not degrade the US platform", async () => {
  const r = await run(feedInput([
    entry("EU - Web Login Down", "Problem detected [Investigating]"),
    entry("AU - Increase in 500 error pages", "Degraded performance [Investigating]"),
  ]));
  assertEquals(r.state, "ok");
  assert(isOtherRegion({ title: "AU - x" }));
  assert(!isOtherRegion({ title: "US - x" }));
  assert(!isOtherRegion({ title: "Issue with email deliveries" }));
});

Deno.test("service: a global (unprefixed) open incident counts", async () => {
  const r = await run(
    feedInput([entry("Issue with email provider", "Degraded performance [Open]")]),
  );
  assertEquals(r.state, "degraded");
});

Deno.test("isOpenIncident: falls back to resolved wording when no state marker is parsable", () => {
  assert(!isOpenIncident({ title: "x", summary: "The issue is resolved" }));
  assert(isOpenIncident({ title: "x", summary: "We are investigating" }));
});

Deno.test("service: a feed error or a missing feed is unknown, never down", async () => {
  assertEquals((await run(undefined)).state, "unknown");
  const errored = { ...feedInput([]), error: "fetch failed" };
  const r = await run(errored);
  assertEquals(r.state, "unknown");
  assertEquals(r.message, "fetch failed");
});
