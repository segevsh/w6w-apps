import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMonitor from "../../triggers/new-monitor.ts";
import newHeartbeat from "../../triggers/new-heartbeat.ts";
import newMonitorGroup from "../../triggers/new-monitor-group.ts";
import newEscalationPolicy from "../../triggers/new-escalation-policy.ts";
import newSeverity from "../../triggers/new-severity.ts";
import newStatusPage from "../../triggers/new-status-page.ts";
import newOnCallCalendar from "../../triggers/new-on-call-calendar.ts";
import newStatusReport from "../../triggers/new-status-report.ts";
import newStatusPageResource from "../../triggers/new-status-page-resource.ts";
import newIncidentComment from "../../triggers/new-incident-comment.ts";

const H = "https://uptime.betterstack.com";
const res = (id: string) => ({ id, type: "x", attributes: { name: `n${id}` } });
const body = (ids: string[], next?: number) => ({
  data: ids.map(res),
  pagination: { next: next ? `https://incidents.betterstack.com/api/v2/x?page=${next}` : null },
});

// Every URL below is a literal: the endpoint the wrapped list action calls, page=1, per_page=250.
const cases = [
  {
    name: "new-monitor",
    t: newMonitor,
    params: {},
    url: `${H}/api/v2/monitors?page=1&per_page=250`,
  },
  {
    name: "new-heartbeat",
    t: newHeartbeat,
    params: {},
    url: `${H}/api/v2/heartbeats?page=1&per_page=250`,
  },
  {
    name: "new-monitor-group",
    t: newMonitorGroup,
    params: {},
    url: `${H}/api/v2/monitor-groups?page=1&per_page=250`,
  },
  {
    name: "new-escalation-policy",
    t: newEscalationPolicy,
    params: {},
    url: `${H}/api/v3/policies?page=1&per_page=250`,
  },
  {
    name: "new-severity",
    t: newSeverity,
    params: {},
    url: `${H}/api/v2/urgencies?page=1&per_page=250`,
  },
  {
    name: "new-status-page",
    t: newStatusPage,
    params: {},
    url: `${H}/api/v2/status-pages?page=1&per_page=250`,
  },
  {
    name: "new-on-call-calendar",
    t: newOnCallCalendar,
    params: {},
    url: `${H}/api/v2/on-calls?page=1&per_page=250`,
  },
  {
    name: "new-status-report",
    t: newStatusReport,
    params: { status_page_id: "77" },
    url: `${H}/api/v2/status-pages/77/status-reports?page=1&per_page=250`,
  },
  {
    name: "new-status-page-resource",
    t: newStatusPageResource,
    params: { status_page_id: "77" },
    url: `${H}/api/v2/status-pages/77/resources?page=1&per_page=250`,
  },
  {
    name: "new-incident-comment",
    t: newIncidentComment,
    params: { incident_id: "25" },
    url: `${H}/api/v2/incidents/25/comments`,
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });
    const poll = c.t.poll!;

    test("seeds without emitting; sends the literal list request", async () => {
      const m = mockCtx([{ body: body(["1", "2"]) }]);
      const out = await poll(input({}), m.ctx);
      assertEquals(out.events, []);
      assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, c.url);
    });

    test("emits exactly the new record and is idempotent on retry", async () => {
      const seeded = await poll(input({}), mockCtx([{ body: body(["1", "2"]) }]).ctx);
      const run = () =>
        poll(input(seeded.nextState), mockCtx([{ body: body(["1", "2", "3"]) }]).ctx);
      const first = await run();
      assertEquals(first.events.length, 1);
      assertEquals((first.events[0] as { id: string }).id, "3");
      assertEquals((first.events[0] as { name: string }).name, "n3");
      assertEquals(await run(), first);
      const quiet = await poll(
        input(first.nextState),
        mockCtx([{ body: body(["1", "2", "3"]) }]).ctx,
      );
      assertEquals(quiet.events, []);
    });
  });
}

describe("snapshot paging", () => {
  test("reads every page (literal page numbers) before diffing", async () => {
    const m = mockCtx([{ body: body(["1"], 2) }, { body: body(["2"]) }]);
    const out = await newMonitor.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
    assertEquals(out.events, []);
    assertEquals(m.calls.map((c) => c.url), [
      `${H}/api/v2/monitors?page=1&per_page=250`,
      `${H}/api/v2/monitors?page=2&per_page=250`,
    ]);
    // the second-page record is part of the seed: it is not emitted later
    const later = await newMonitor.poll!(
      { params: {}, subscriptionId: "s", state: out.nextState },
      mockCtx([{ body: body(["1"], 2) }, { body: body(["2", "3"]) }]).ctx,
    );
    assertEquals(later.events.map((e) => (e as { id: string }).id), ["3"]);
  });

  test("refuses a collection beyond the 20-page cap instead of truncating", async () => {
    const pages = Array.from({ length: 20 }, (_, i) => ({ body: body([`p${i}`], i + 2) }));
    await assertRejects(
      () => newMonitor.poll!({ params: {}, subscriptionId: "s", state: {} }, mockCtx(pages).ctx),
      Error,
      "5000",
    );
  });
});
