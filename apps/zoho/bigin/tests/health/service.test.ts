import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";

function feedOf(titles: string[]) {
  return {
    entries: titles.map((title, i) => ({ id: String(i), title, summary: "", summaryHtml: "" })),
    latest: titles.map((title, i) => ({ id: String(i), title, summary: "", summaryHtml: "" })),
    fetchedAt: new Date().toISOString(),
  };
}

Deno.test("service: unknown, never down, when the feed itself failed", () => {
  const result = service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "", error: "boom" } },
    {} as never,
  );
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("service: unknown when the feed carries no Zoho Bigin component", () => {
  const result = service.check!(
    { feed: feedOf(["Zoho CRM - Operational", "Zoho Mail - Operational"]) },
    {} as never,
  );
  assertEquals((result as { state: string }).state, "unknown");
});

/**
 * The live feed carries both of these on 2026-09-22 — "Bigin Marketplace" is a
 * different product, and a substring match on "Bigin" would report one
 * product's outage as the other's.
 */
Deno.test("service: matches 'Zoho Bigin' exactly and ignores 'Bigin Marketplace'", () => {
  const marketplaceOnly = service.check!(
    { feed: feedOf(["Bigin Marketplace - Major Outage"]) },
    {} as never,
  );
  assertEquals((marketplaceOnly as { state: string }).state, "unknown");

  const both = service.check!(
    {
      feed: feedOf([
        "Bigin Marketplace - Major Outage",
        "Zoho Bigin - Operational",
      ]),
    },
    {} as never,
  );
  assertEquals((both as { state: string }).state, "ok");
});

Deno.test("service: maps the StatusIQ status words", () => {
  const cases: Array<[string, string]> = [
    ["Operational", "ok"],
    ["Under Maintenance", "degraded"],
    ["Degraded Performance", "degraded"],
    ["Partial Outage", "degraded"],
    ["Major Outage", "down"],
  ];
  for (const [word, state] of cases) {
    const result = service.check!({ feed: feedOf([`Zoho Bigin - ${word}`]) }, {} as never);
    assertEquals((result as { state: string }).state, state, word);
  }
});

Deno.test("service: an unrecognised status word is unknown, not guessed", () => {
  const result = service.check!({ feed: feedOf(["Zoho Bigin - Something New"]) }, {} as never);
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("service: declares the feed, stays unsigned, and never widens egress by hand", () => {
  assertEquals(service.feed?.url, "https://us.zohostatus.com/rss");
  assertEquals(service.network, undefined);
  assertEquals(service.kind, "service");
  assertEquals(service.credential, undefined);
  assertEquals(service.minIntervalSeconds, 300);
});
