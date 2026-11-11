import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, queryOf } from "../_helpers.ts";
import newMonitor from "../../triggers/new-monitor.ts";
import newDashboard from "../../triggers/new-dashboard.ts";
import newDowntime from "../../triggers/new-downtime.ts";
import newUser from "../../triggers/new-user.ts";
import newHost, { clock } from "../../triggers/new-host.ts";

const API = "https://api.datadoghq.com";

interface Case {
  name: string;
  trigger: typeof newMonitor;
  /** Wrap records the way the endpoint answers. */
  wrap(items: unknown[]): unknown;
  idKey: string;
  path: string;
  query: Record<string, string>;
}

const cases: Case[] = [
  {
    name: "new-monitor",
    trigger: newMonitor,
    wrap: (items) => items,
    idKey: "id",
    path: "/api/v1/monitor",
    query: { page: "0", page_size: "1000" },
  },
  {
    name: "new-dashboard",
    trigger: newDashboard,
    wrap: (dashboards) => ({ dashboards }),
    idKey: "id",
    path: "/api/v1/dashboard",
    query: { count: "100", start: "0" },
  },
  {
    name: "new-downtime",
    trigger: newDowntime,
    wrap: (data) => ({ data }),
    idKey: "id",
    path: "/api/v2/downtime",
    query: { "page[limit]": "100", "page[offset]": "0" },
  },
  {
    name: "new-user",
    trigger: newUser,
    wrap: (data) => ({ data }),
    idKey: "id",
    path: "/api/v2/users",
    query: { "page[size]": "100", "page[number]": "0", sort: "name" },
  },
  {
    name: "new-host",
    trigger: newHost,
    wrap: (host_list) => ({ host_list }),
    idKey: "id",
    path: "/api/v1/hosts",
    // clock pinned to 1_700_000_000_000 ms: 1_700_000_000 s minus 7 days (604800 s).
    query: { from: "1699395200", start: "0", count: "1000" },
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const body = (ids: string[]) => ({ body: c.wrap(ids.map((id) => ({ [c.idKey]: id }))) });
    const run = async (state: unknown, ids: string[]) => {
      const original = clock.now;
      clock.now = () => 1_700_000_000_000;
      try {
        const m = mockCtx([body(ids)]);
        const out = await c.trigger.poll!({ params: {}, state }, m.ctx);
        return { out, calls: m.calls };
      } finally {
        clock.now = original;
      }
    };

    test("seeds without emitting", async () => {
      const { out } = await run({}, ["a"]);
      assertEquals(out.events, []);
      assertEquals(out.nextState.seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = await run({}, ["a"]);
      const first = await run(seeded.out.nextState, ["a", "b"]);
      assertEquals(first.out.events, [{ [c.idKey]: "b" }]);
      const retry = await run(seeded.out.nextState, ["a", "b"]);
      assertEquals(retry.out, first.out);
    });

    test("requests the literal endpoint", async () => {
      const { calls } = await run({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url.split("?")[0], `${API}${c.path}`);
      assertEquals(queryOf(calls[0].url), c.query);
    });
  });
}

test("a walk follows full pages and reads the next offset", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `d${i}` }));
  const m = mockCtx([{ body: { dashboards: full } }, { body: { dashboards: [{ id: "last" }] } }]);
  const seeded = await newDashboard.poll!({ params: {}, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.map((call) => queryOf(call.url)), [
    { count: "100", start: "0" },
    { count: "100", start: "100" },
  ]);
});

test("a collection past the 5000-record ceiling fails loudly instead of truncating", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `d${i}` }));
  const m = mockCtx(Array.from({ length: 60 }, () => ({ body: { dashboards: full } })));
  await assertRejects(
    () => newDashboard.poll!({ params: {}, state: {} }, m.ctx),
    Error,
    "more than 5000",
  );
});
