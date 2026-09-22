import { assertEquals } from "@std/assert";

import service, { classifyEntry, STATUS_FEED_URL } from "../../health/service.ts";

/**
 * Feed entries in the shape the live document serves: the state lives in the
 * body as incident.io's `<b>Status: …</b>`, never in the title.
 */
function feedOf(entries: Array<{ title: string; status?: string }>) {
  return {
    entries: [],
    latest: entries.map((e, i) => ({
      id: String(i),
      title: e.title,
      summary: e.status ? `Status: ${e.status} Some vendor prose about it` : "Vendor prose only",
      summaryHtml: e.status ? `<b>Status: ${e.status}</b>` : "<p>Vendor prose only</p>",
    })),
    fetchedAt: "2026-09-22T17:00:00.000Z",
  };
}

Deno.test("service: a feed that itself failed is unknown, never down", async () => {
  const result = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "", error: "boom" } },
    {} as never,
  );

  assertEquals(result.state, "unknown");
});

Deno.test("service: the live vocabulary (Resolvido/Concluído) reads as closed", async () => {
  const result = await service.check!(
    {
      feed: feedOf([
        { title: "Indisponibilidade RD Station CRM", status: "Resolvido" },
        { title: "Manutenção: Melhorias em formulários", status: "Concluído" },
      ]),
    },
    {} as never,
  );

  assertEquals(result.state, "ok");
});

Deno.test("service: a still-open incident is degraded, and named", async () => {
  const result = await service.check!(
    {
      feed: feedOf([
        { title: "Indisponibilidade RD Station CRM", status: "Investigando" },
        { title: "Manutenção antiga", status: "Concluído" },
      ]),
    },
    {} as never,
  );

  assertEquals(result.state, "degraded");
  assertEquals(result.message?.includes("Indisponibilidade RD Station CRM"), true);
});

Deno.test("service: an unfamiliar status word is unknown, not guessed open or closed", async () => {
  const result = await service.check!(
    { feed: feedOf([{ title: "Something new", status: "Analisando" }]) },
    {} as never,
  );

  assertEquals(result.state, "unknown");
});

Deno.test("service: an entry with no status marker at all is unknown", async () => {
  const result = await service.check!({ feed: feedOf([{ title: "No marker" }]) }, {} as never);

  assertEquals(result.state, "unknown");
});

Deno.test("service: an empty feed is ok — nothing is down", async () => {
  const result = await service.check!({ feed: feedOf([]) }, {} as never);

  assertEquals(result.state, "ok");
});

Deno.test("classifyEntry: reads the one- and two-word forms, and only the body's marker", () => {
  const entry = (status?: string) =>
    feedOf([{ title: "Indisponibilidade RD Station CRM", status }]).latest[0];

  assertEquals(classifyEntry(entry("Resolvido")), "closed");
  assertEquals(classifyEntry(entry("Concluído")), "closed");
  assertEquals(classifyEntry(entry("Cancelado")), "closed");
  assertEquals(classifyEntry(entry("Em andamento")), "open");
  assertEquals(classifyEntry(entry("Monitorando")), "open");
  assertEquals(classifyEntry(entry()), "unrecognised");
});

Deno.test("service: declares the feed, stays unsigned, informational, without widening egress", () => {
  assertEquals(service.feed?.url, STATUS_FEED_URL);
  assertEquals(STATUS_FEED_URL, "https://status.rdstation.com/history.rss");
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network, undefined);
  assertEquals(service.minIntervalSeconds, 300);
});
