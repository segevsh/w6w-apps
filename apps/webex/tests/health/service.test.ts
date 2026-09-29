import { assert, assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary = ""): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.webex.com/",
  publishedAt: "2026-09-29T00:00:00.000Z",
});

/** A well-formed `input.feed`, so each test states only what it is varying. */
const feedInput = (partial: Partial<HealthFeedInput>): HealthFeedInput => ({
  entries: [],
  latest: [],
  fetchedAt: "2026-09-29T00:00:00.000Z",
  ...partial,
});

const run = (feed: HealthFeedInput | undefined) => {
  const { ctx } = mockCtx();
  return service.check!({ feed }, ctx);
};

Deno.test("service: is a feed-backed, unsigned, app-scoped, informational check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.feed?.url, "https://status.webex.com/history.rss");
  assertEquals(service.severity, "informational");

  // The spec REQUIRES an unsigned posture for a feed-backed check.
  assert(service.credential === undefined || service.credential === "none");

  // The feed host is allowlisted implicitly.
  assertEquals(service.network, undefined);

  // A declared feed and a declared absence are mutually exclusive.
  assertEquals(service.unavailable, undefined);
});

Deno.test("service: no open incidents is ok", async () => {
  assertEquals((await run(feedInput({}))).state, "ok");
});

Deno.test("service: an open incident is degraded and names itself", async () => {
  const r = await run(
    feedInput({
      latest: [entry("Webex Services: Login failures for the Webex API service", "investigating")],
    }),
  );
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Webex Services: Login failures for the Webex API service"));
});

Deno.test("service: a resolved/completed/monitoring incident is not a live outage", async () => {
  for (const marker of ["resolved", "completed", "monitoring"]) {
    const r = await run(
      feedInput({ latest: [entry("Webex Calling Service Maintenance", `in progress ${marker}`)] }),
    );
    assertEquals(r.state, "ok", `"${marker}" should not read as an open incident`);
  }
});

Deno.test("service: a mixed feed reports only what is still open", async () => {
  const r = await run(feedInput({
    latest: [
      entry("Old maintenance", "completed"),
      entry("Live incident", "investigating"),
    ],
  }));
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Live incident");
});

Deno.test("service: an unreadable feed is unknown, never down", async () => {
  assertEquals((await run(feedInput({ error: "502" }))).state, "unknown");
  assertEquals((await run(undefined)).state, "unknown");
});

Deno.test("service: the check makes no network call of its own", async () => {
  const { ctx, calls } = mockCtx();
  await service.check!({ feed: feedInput({}) }, ctx);
  assertEquals(calls.length, 0);
});
