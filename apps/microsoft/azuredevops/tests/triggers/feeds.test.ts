import { afterEach, describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx as baseCtx, type MockResponse } from "../_helpers.ts";
import { clock } from "../../lib/feeds.ts";
import newCommit from "../../triggers/new-commit.ts";
import newPullRequest from "../../triggers/new-pull-request.ts";
import newRepository from "../../triggers/new-repository.ts";
import newBranch from "../../triggers/new-branch.ts";
import newPipeline from "../../triggers/new-pipeline.ts";
import newProject from "../../triggers/new-project.ts";

const mockCtx = (r: MockResponse[]) => baseCtx(r, { display: { organization: "org" } });
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const input = (params: Record<string, unknown>, state: unknown) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;
const idOf = (key: string) => (e: unknown) => String((e as Record<string, unknown>)[key]);
const START = Date.parse("2026-11-10T11:00:00Z");
const seeded = { v: 1, kind: "ids", seeded: true, ids: [], cursor: START, floor: START };

// ---- snapshot triggers -------------------------------------------------------------------------
describe("snapshot triggers", () => {
  const cases = [
    {
      trigger: newRepository,
      params: { project: "proj" },
      url: "https://dev.azure.com/org/proj/_apis/git/repositories?api-version=7.1",
      rows: (...ids: string[]) => ids.map((id) => ({ id, name: `n-${id}` })),
      key: "id",
    },
    {
      trigger: newBranch,
      params: { project: "proj", repository: "repo" },
      url:
        "https://dev.azure.com/org/proj/_apis/git/repositories/repo/refs?filter=heads&api-version=7.1",
      rows: (...ids: string[]) => ids.map((id) => ({ name: `refs/heads/${id}`, objectId: "abc" })),
      key: "name",
    },
    {
      trigger: newPipeline,
      params: { project: "proj" },
      url: "https://dev.azure.com/org/proj/_apis/build/definitions?%24top=1000&api-version=7.1",
      rows: (...ids: string[]) => ids.map((id) => ({ id: Number(id), name: `p${id}` })),
      key: "id",
    },
    {
      trigger: newProject,
      params: {},
      url:
        "https://dev.azure.com/org/_apis/projects?stateFilter=wellFormed&%24top=1000&api-version=7.1",
      rows: (...ids: string[]) => ids.map((id) => ({ id, name: `n-${id}` })),
      key: "id",
    },
  ];
  for (const c of cases) {
    test(`${c.trigger.key}: seeds, requests the literal list, emits only the added row, retries`, async () => {
      const seed = mockCtx([{ body: { value: c.rows("1") } }]);
      const first0 = await c.trigger.poll!(input(c.params, {}), seed.ctx);
      assertEquals(first0.events, []);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const responses = [{ body: { value: c.rows("1", "2") } }];
      const a = await c.trigger.poll!(input(c.params, first0.nextState), mockCtx(responses).ctx);
      const b = await c.trigger.poll!(input(c.params, first0.nextState), mockCtx(responses).ctx);
      assertEquals(a.events.length, 1);
      assertEquals(idOf(c.key)(a.events[0]) === idOf(c.key)(c.rows("2")[0]), true);
      assertEquals(b, a);
    });
  }
  test("a listing that fills the 1000-row cap throws instead of guessing", async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    let message = "";
    try {
      await newPipeline.poll!(
        input({ project: "proj" }, {}),
        mockCtx([{ body: { value: rows } }]).ctx,
      );
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes("1000"), true);
  });
});

// ---- since-filter triggers ---------------------------------------------------------------------
const cases = [
  {
    name: "new-commit",
    trigger: newCommit,
    params: { project: "proj", repository: "repo" },
    key: "commitId",
    mk: (id: string, iso: string) => ({ commitId: id, committer: { date: iso } }),
    page: (items: unknown[]) => ({ body: { value: items } }),
    url: (skip: number, to = "2026-11-10T12:00:00.000Z") =>
      "https://dev.azure.com/org/proj/_apis/git/repositories/repo/commits?" +
      "searchCriteria.fromDate=2026-11-10T10%3A58%3A00.000Z" +
      `&searchCriteria.toDate=${encodeURIComponent(to)}&searchCriteria.%24top=100` +
      (skip ? `&searchCriteria.%24skip=${skip}` : "") + "&api-version=7.1",
  },
  {
    name: "new-pull-request",
    trigger: newPullRequest,
    params: { project: "proj", repository: "repo" },
    key: "pullRequestId",
    mk: (id: string, iso: string) => ({
      pullRequestId: Number(id.replace(/\D/g, "") || 0) + 1000 * id.length,
      creationDate: iso,
    }),
    page: (items: unknown[]) => ({ body: { value: items } }),
    url: (skip: number, to = "2026-11-10T12:00:00.000Z") =>
      "https://dev.azure.com/org/proj/_apis/git/repositories/repo/pullrequests?" +
      "searchCriteria.status=all" +
      "&searchCriteria.minTime=2026-11-10T10%3A58%3A00.000Z" +
      `&searchCriteria.maxTime=${encodeURIComponent(to)}&%24top=100` +
      (skip ? `&%24skip=${skip}` : "") + "&api-version=7.1",
  },
];

for (const c of cases) {
  describe(`${c.name} (since-filter)`, () => {
    const run = (state: unknown, responses: MockResponse[]) => {
      const m = mockCtx(responses);
      return { m, out: c.trigger.poll!(input(c.params, state), m.ctx) };
    };

    test("seed reads nothing and emits nothing", async () => {
      at("2026-11-10T11:00:00Z");
      const { m, out } = run({}, []);
      const r = await out;
      assertEquals(r.events, []);
      assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 0);
    });

    test("requests the literal window, emits the new item, retry is identical", async () => {
      at("2026-11-10T12:00:00Z");
      const fresh = c.mk("fresh", "2026-11-10T11:30:00Z");
      const old = c.mk("old", "2026-11-10T10:59:00Z");
      const a = run(seeded, [c.page([fresh, old])]);
      const first = await a.out;
      const retry = await run(seeded, [c.page([fresh, old])]).out;
      assertEquals(a.m.calls[0].method, "GET");
      assertEquals(a.m.calls[0].url, c.url(0));
      assertEquals(first.events, [fresh]);
      assertEquals(retry, first);
    });

    test("9.9: pre-seed items are never emitted, however many pages the window holds", async () => {
      at("2026-11-10T11:00:00Z");
      const s = await run({}, []).out;
      at("2026-11-10T11:05:00Z");
      const full = (n: number) =>
        c.page(Array.from({ length: 100 }, (_, i) => c.mk(`p${n}-${i}`, "2026-11-10T10:59:00Z")));
      const r1 = await run(s.nextState, [1, 2, 3, 4, 5].map(full)).out;
      assertEquals(r1.events, []);
      const r2 = await run(r1.nextState, [c.page([c.mk("tail", "2026-11-10T10:59:30Z")])]).out;
      assertEquals(r2.events, []);
      at("2026-11-10T11:10:00Z");
      const fresh = c.mk("fresh", "2026-11-10T11:06:00Z");
      const r3 = await run(r2.nextState, [c.page([fresh])]).out;
      assertEquals(r3.events, [fresh]);
    });

    test("9.8: 5+1 full pages drain across two checks, offsets advance, none twice", async () => {
      const seen: string[] = [];
      at("2026-11-10T11:30:00Z");
      const full = (n: number) =>
        c.page(Array.from({ length: 100 }, (_, i) => c.mk(`p${n}-${i}`, "2026-11-10T11:10:00Z")));
      const a = run(seeded, [1, 2, 3, 4, 5].map(full));
      const r1 = await a.out;
      assertEquals(a.m.calls.length, 5);
      assertEquals(a.m.calls[0].url, c.url(0, "2026-11-10T11:30:00.000Z"));
      assertEquals(a.m.calls[1].url, c.url(100, "2026-11-10T11:30:00.000Z"));
      assertEquals(a.m.calls[4].url, c.url(400, "2026-11-10T11:30:00.000Z"));
      seen.push(...r1.events.map(idOf(c.key)));
      assertEquals((r1.nextState as { cursor?: number }).cursor, START);
      at("2026-11-10T11:35:00Z");
      const b = run(r1.nextState, [
        c.page(Array.from({ length: 20 }, (_, i) => c.mk(`z${i}`, "2026-11-10T11:12:00Z"))),
      ]);
      const r2 = await b.out;
      assertEquals(b.m.calls[0].url, c.url(500, "2026-11-10T11:30:00.000Z"));
      seen.push(...r2.events.map(idOf(c.key)));
      assertEquals(
        (r2.nextState as { cursor?: number }).cursor,
        Date.parse("2026-11-10T11:30:00Z"),
      );
      assertEquals(seen.length, 520);
      assertEquals(new Set(seen).size, 520);
    });
  });
}
