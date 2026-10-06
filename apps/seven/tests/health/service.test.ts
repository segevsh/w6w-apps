import { assertEquals } from "@std/assert";
import service, { field } from "../../health/service.ts";

const entry = (title: string, summary: string, id = title) => ({
  id,
  title,
  summary,
  summaryHtml: summary,
});
const feed = (...latest: ReturnType<typeof entry>[]) => ({
  entries: latest,
  latest,
  fetchedAt: "2026-10-06T00:00:00Z",
});
const run = (
  f: ReturnType<typeof feed> | { error: string; entries: []; latest: []; fetchedAt: string },
) => service.check!({ feed: f } as never, {} as never);

Deno.test("service: reads the status.seven.io Atom feed with no hook-side fetch", () => {
  assertEquals(service.feed?.url, "https://status.seven.io/history.atom");
  assertEquals(service.kind, "service");
});

Deno.test("service: only resolved incidents is ok", async () => {
  const r = await run(
    feed(entry("Short disruption", "Status: resolved\nImpact: critical\nAffected: HTTP Api")),
  );
  assertEquals(r.state, "ok");
});

Deno.test("service: an open incident on a reachable component is degraded, never down", async () => {
  const r = await run(
    feed(
      entry(
        "SMS delays",
        "Status: investigating\nImpact: critical\nAffected: SMS Delivery, Webapp",
      ),
    ),
  );
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "SMS delays");
});

Deno.test("service: an open incident on Webapp / SMPP only does not drive the verdict", async () => {
  const r = await run(
    feed(entry("Webapp slow", "Status: identified\nImpact: major\nAffected: Webapp, SMPP Server")),
  );
  assertEquals(r.state, "ok");
});

Deno.test("service: open Impact: none (announced work) is ok; an entry with no Affected line counts", async () => {
  assertEquals(
    (await run(feed(entry("Maintenance", "Status: monitoring\nImpact: none\nAffected: Voice"))))
      .state,
    "ok",
  );
  assertEquals(
    (await run(feed(entry("Unscoped", "Status: investigating\nImpact: major")))).state,
    "degraded",
  );
});

Deno.test("service: a feed error is unknown, never down", async () => {
  const r = await run({ error: "fetch failed", entries: [], latest: [], fetchedAt: "x" });
  assertEquals(r.state, "unknown");
});

Deno.test("service: field() reads a labelled line case-insensitively", () => {
  assertEquals(field("Status: Resolved\nImpact: minor", "status"), "Resolved");
  assertEquals(field("no labels here", "status"), undefined);
});
