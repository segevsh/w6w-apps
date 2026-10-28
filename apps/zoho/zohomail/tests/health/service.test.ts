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

Deno.test("service: unknown when the feed carries no Zoho Mail component", () => {
  const result = service.check!(
    { feed: feedOf(["Zoho CRM - Operational", "Zoho Mail-IMAP - Operational"]) },
    {} as never,
  );
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("service: does not match the protocol-specific Zoho Mail-IMAP/-POP/-SMTP components", () => {
  const result = service.check!(
    {
      feed: feedOf([
        "Zoho Mail-IMAP - Major Outage",
        "Zoho Mail-POP - Major Outage",
        "Zoho Mail-SMTP - Major Outage",
        "Zoho Mail - Operational",
      ]),
    },
    {} as never,
  );
  assertEquals((result as { state: string; message?: string }).state, "ok");
});

Deno.test("service: maps Operational to ok", () => {
  const result = service.check!({ feed: feedOf(["Zoho Mail - Operational"]) }, {} as never);
  assertEquals((result as { state: string }).state, "ok");
});

Deno.test("service: maps Major Outage to down", () => {
  const result = service.check!({ feed: feedOf(["Zoho Mail - Major Outage"]) }, {} as never);
  assertEquals((result as { state: string }).state, "down");
});

Deno.test("service: maps Degraded Performance and Partial Outage and Under Maintenance to degraded", () => {
  for (const status of ["Degraded Performance", "Partial Outage", "Under Maintenance"]) {
    const result = service.check!({ feed: feedOf([`Zoho Mail - ${status}`]) }, {} as never);
    assertEquals((result as { state: string }).state, "degraded", status);
  }
});

Deno.test("service: an unrecognised status word is unknown, not guessed", () => {
  const result = service.check!({ feed: feedOf(["Zoho Mail - Something New"]) }, {} as never);
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("service: declares the feed and no network widening of its own", () => {
  assertEquals(service.feed?.url, "https://us.zohostatus.com/rss");
  assertEquals(service.network, undefined);
  assertEquals(service.kind, "service");
});
