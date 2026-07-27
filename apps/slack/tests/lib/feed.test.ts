import { assertEquals } from "@std/assert";
import { latestPerId, listItems, parseFeed } from "../../lib/feed.ts";

/** Trimmed from the live Atom feed at slack-status.com/feed/atom. */
const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xml:lang="en-US" xmlns="http://www.w3.org/2005/Atom">
  <id>https://status.slack.com</id>
  <title>Slack System Status</title>
  <updated>2026-02-02T09:53:54-08:00</updated>
  <entry>
    <id>https://slack-status.com/2026-01/6f029c99f2b77bcd</id>
    <published>2026-01-30T07:52:19-08:00</published>
    <updated>2026-02-02T09:53:54-08:00</updated>
    <link rel="alternate" type="text/html" href="https://slack-status.com/2026-01/6f029c99f2b77bcd" />
    <title>Incident: Trouble connecting to Salesforce Channels</title>
    <summary>This issue is now resolved.&amp;nbsp;Scope: a &quot;ZC:&quot; prefix appeared.</summary>
  </entry>
  <entry>
    <id>https://slack-status.com/2026-01/aaaa</id>
    <published>2026-01-10T01:00:00-08:00</published>
    <updated>2026-01-10T02:00:00-08:00</updated>
    <title>Notice: Scheduled maintenance</title>
    <summary>Nothing to see.</summary>
  </entry>
</feed>`;

/** Trimmed from the live RSS feed at status.mistral.ai/feed.rss. */
const RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Mistral AI Status Page</title>
    <item>
      <title><![CDATA[Audio API Degraded]]></title>
      <link>https://status.mistral.ai/incident/4c854daa</link>
      <guid isPermaLink="true">https://status.mistral.ai/incident/4c854daa</guid>
      <pubDate>Sun, 26 Jul 2026 02:47:40 GMT</pubDate>
      <description><![CDATA[Status: Resolved<br/>The incident has been resolved<br/><br/>Affected services<ul><li>Audio API</li></ul>]]></description>
    </item>
    <item>
      <title><![CDATA[Audio API Degraded]]></title>
      <link>https://status.mistral.ai/incident/4c854daa</link>
      <guid isPermaLink="true">https://status.mistral.ai/incident/4c854daa</guid>
      <pubDate>Sun, 26 Jul 2026 02:46:53 GMT</pubDate>
      <description><![CDATA[Status: Investigating<br/>Requests are degraded.<br/><br/>Affected services<ul><li>Audio API</li><li>Chat API</li></ul>]]></description>
    </item>
  </channel>
</rss>`;

Deno.test("feed: reads Atom entries", () => {
  const { title, entries } = parseFeed(ATOM);
  assertEquals(title, "Slack System Status");
  assertEquals(entries.length, 2);
  assertEquals(entries[0].title, "Incident: Trouble connecting to Salesforce Channels");
  assertEquals(entries[0].id, "https://slack-status.com/2026-01/6f029c99f2b77bcd");
  assertEquals(entries[0].link, "https://slack-status.com/2026-01/6f029c99f2b77bcd");
});

Deno.test("feed: Atom prefers <updated> over <published>", () => {
  const { entries } = parseFeed(ATOM);
  // <updated> is 2026-02-02, <published> 2026-01-30 — "last changed" is the question.
  assertEquals(entries[0].published?.toISOString(), "2026-02-02T17:53:54.000Z");
});

Deno.test("feed: decodes entities, including the double-escaped &amp;nbsp;", () => {
  const { entries } = parseFeed(ATOM);
  assertEquals(entries[0].summary, `This issue is now resolved. Scope: a "ZC:" prefix appeared.`);
});

Deno.test("feed: reads RSS items and unwraps CDATA", () => {
  const { title, entries } = parseFeed(RSS);
  assertEquals(title, "Mistral AI Status Page");
  assertEquals(entries.length, 2);
  assertEquals(entries[0].title, "Audio API Degraded");
});

Deno.test("feed: RSS pubDate (RFC 822) parses", () => {
  const { entries } = parseFeed(RSS);
  assertEquals(entries[0].published?.toISOString(), "2026-07-26T02:47:40.000Z");
});

Deno.test("feed: strips markup but keeps words apart", () => {
  const { entries } = parseFeed(RSS);
  assertEquals(
    entries[0].summary,
    "Status: Resolved The incident has been resolved Affected services Audio API",
  );
});

Deno.test("feed: summaryHtml keeps the markup the text form drops", () => {
  const { entries } = parseFeed(RSS);
  assertEquals(listItems(entries[0].summaryHtml), ["Audio API"]);
  assertEquals(listItems(entries[1].summaryHtml), ["Audio API", "Chat API"]);
});

Deno.test("feed: entries come back newest-first regardless of document order", () => {
  const reversed = RSS.replace(/Status: Resolved/, "Status: PLACEHOLDER")
    .replace(/Status: Investigating/, "Status: Resolved")
    .replace(/Status: PLACEHOLDER/, "Status: Investigating");
  const { entries } = parseFeed(reversed);
  assertEquals(entries[0].published! > entries[1].published!, true);
});

Deno.test("latestPerId: folds successive updates down to one per incident", () => {
  const { entries } = parseFeed(RSS);
  assertEquals(entries.length, 2, "two updates in the document");
  const incidents = latestPerId(entries);
  assertEquals(incidents.length, 1, "one incident");
  // The NEWEST update wins — this is the bug the fold exists to prevent.
  assertEquals(incidents[0].summary.startsWith("Status: Resolved"), true);
});

Deno.test("latestPerId: keeps entries that carry no id", () => {
  const { entries } = parseFeed(
    `<rss><channel><item><title>a</title></item><item><title>b</title></item></channel></rss>`,
  );
  assertEquals(latestPerId(entries).length, 2);
});

Deno.test("feed: unreadable input yields no entries rather than throwing", () => {
  assertEquals(parseFeed("<!DOCTYPE html><html><body>not a feed</body></html>").entries, []);
  assertEquals(parseFeed("").entries, []);
});
