import { assertEquals } from "@std/assert";
import service, { FEED_URL, RESOLVED } from "../../health/service.ts";

function entry(title: string, summary: string) {
  return { id: title, title, summary, summaryHtml: summary, publishedAt: "2026-01-01T00:00:00Z" };
}

Deno.test("service: declares an app-scoped, unsigned feed-backed check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.feed?.url, FEED_URL);
  assertEquals(FEED_URL, "https://www.gocardless-status.com/history.rss");
  // The feed's host is allowlisted implicitly; restating it would be a second
  // place to keep in sync.
  assertEquals(service.network, undefined);
  // The feed is real, so this is the normal live case and not an absence.
  assertEquals(service.severity, undefined);
});

Deno.test("service: ok when every latest entry reads `Status: Resolved`", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("Card payments degraded", "Status: Resolved Back to normal")],
        fetchedAt: "now",
      },
    },
    {} as never,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: degraded while an incident is still open, naming it", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry(
          "Direct Debit collections delayed",
          "Status: Investigating We are investigating",
        )],
        fetchedAt: "now",
      },
    },
    {} as never,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Direct Debit collections delayed");
});

Deno.test("service: every non-resolved status word counts as open", async () => {
  for (const word of ["Investigating", "Identified", "Monitoring", "Scheduled"]) {
    const out = await service.check!(
      {
        feed: {
          entries: [],
          latest: [entry(`Incident ${word}`, `Status: ${word} We are on it`)],
          fetchedAt: "now",
        },
      },
      {} as never,
    );
    assertEquals(out.state, "degraded", word);
  }
});

Deno.test("service: several open incidents are all named", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [
          entry("A", "Status: Investigating"),
          entry("B", "Status: Resolved All clear"),
          entry("C", "Status: Monitoring"),
        ],
        fetchedAt: "now",
      },
    },
    {} as never,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "A; C");
});

/**
 * The status source is not GoCardless: a feed that failed to fetch says nothing
 * about the vendor, and reporting `down` would blame GoCardless for it.
 */
Deno.test("service: unknown when the feed could not be fetched", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [],
        fetchedAt: "now",
        error: "www.gocardless-status.com timed out",
      },
    },
    {} as never,
  );
  assertEquals(out.state, "unknown");
  assertEquals(out.message, "www.gocardless-status.com timed out");
});

Deno.test("service: ok with no feed input at all (defensive default)", async () => {
  const out = await service.check!({}, {} as never);
  assertEquals(out.state, "ok");
});

Deno.test("service: the resolved matcher reads the entry's own Status line", () => {
  // How the host hands `summary` over: plain text, markup already stripped.
  assertEquals(RESOLVED.test("Status: Resolved Back to normal"), true);
  assertEquals(RESOLVED.test("Status:  resolved"), true);
  assertEquals(RESOLVED.test("Status: Investigating We are on it"), false);
  // A host that left the markup in must not turn every entry into an outage.
  assertEquals(RESOLVED.test("<b>Status: Resolved</b><br/>Back to normal"), true);
  // A resolved *mention* inside prose is not the entry's status line.
  assertEquals(RESOLVED.test("Earlier incident resolved; new one investigating"), false);
  // A word that merely starts with `resolved` is not a resolution.
  assertEquals(RESOLVED.test("Status: Resolvedness improved"), false);
});
