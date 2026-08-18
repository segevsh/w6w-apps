import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

/** For a self-hosted app this is the check that matters. */
Deno.test("instance: probes this connection's own /health, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "available" } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://search.example.com/health");
  assertEquals(report.state, "ok");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  // Unsigned: an expired key must not make the server look down.
  assertEquals(instance.credential, "context");
});

Deno.test("instance: an unreachable server is down — that is what this check is for", async () => {
  const { ctx } = mockCtx([], conn);
  // No queued response: the mock throws, standing in for a dead host.
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

Deno.test("instance: a non-200 from /health is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("503"), report.message);
});

Deno.test("instance: a health answer other than `available` is degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "loading" } }], conn);
  assertEquals((await instance.check!({}, ctx)).state, "degraded");
});

Deno.test("instance: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no instance URL"), report.message);
});

/**
 * The Cloud feed says nothing about a self-hosted server, so it is scoped to a
 * component rather than `*` and cannot pin the App's verdict.
 */
Deno.test("service: speaks only for Cloud, and is informational", () => {
  assertEquals(service.covers, ["component:cloud"]);
  assertEquals(service.severity, "informational");
  assertEquals(service.feed!.url, "https://status.meilisearch.com/feed.rss");
  assertEquals(service.feed!.format, "rss");
});

const entry = (title: string, publishedAt: string, summary = "") => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  publishedAt,
});

const NOW = "2026-08-18T12:00:00Z";

Deno.test("service: no recent open incident is ok", async () => {
  const report = await service.check!({
    feed: {
      entries: [],
      latest: [entry("Elevated latency", "2026-08-01T00:00:00Z")],
      fetchedAt: NOW,
    },
  }, mockCtx([], conn).ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a fresh unresolved incident is degraded, and names itself", async () => {
  const report = await service.check!({
    feed: {
      entries: [],
      latest: [entry("Search degraded in eu-west", "2026-08-18T09:00:00Z")],
      fetchedAt: NOW,
    },
  }, mockCtx([], conn).ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("eu-west"), report.message);
});

/** Better Stack titles a closed incident with the word, so a recent entry is not enough. */
Deno.test("service: a resolved incident is history, however recent", async () => {
  const report = await service.check!({
    feed: {
      entries: [],
      latest: [entry("Resolved: search degraded in eu-west", "2026-08-18T11:00:00Z")],
      fetchedAt: NOW,
    },
  }, mockCtx([], conn).ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a broken feed is unknown, never degraded", async () => {
  const withError = await service.check!({
    feed: { entries: [], latest: [], fetchedAt: NOW, error: "404" },
  }, mockCtx([], conn).ctx);
  assertEquals(withError.state, "unknown");

  const missing = await service.check!({}, mockCtx([], conn).ctx);
  assertEquals(missing.state, "unknown");
});
