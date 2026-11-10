import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import { clock } from "../../lib/triggers.ts";
import newApplication from "../../triggers/new-application.ts";
import newApplicationFeedback from "../../triggers/new-application-feedback.ts";
import newInterviewSchedule from "../../triggers/new-interview-schedule.ts";
import newJob from "../../triggers/new-job.ts";
import newOffer from "../../triggers/new-offer.ts";
import newUser from "../../triggers/new-user.ts";
import newJobPosting from "../../triggers/new-job-posting.ts";

// Round 3 poll triggers over Ashby list actions. Table-driven: every trigger below is driven through
// the brief 5 cases (seed / one new item / idempotent retry / LITERAL request); the since-filter ones
// also through 9.8 (a multi-page window read whole, emitted once, cursor advances) and 9.9 (records
// that predate the seed never fire).
const T0 = 1_800_000_000_000; // the seed instant (ms)
const OVERLAP = 120_000;
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const input = { params: {}, subscriptionId: "s" };

interface Since {
  name: string;
  trigger: TriggerDefinition;
  url: string;
  list: string;
  /** Extra body fields the trigger sends besides createdAfter/limit (literal). */
  body: Record<string, unknown>;
  item: (id: string, ms: number) => Record<string, unknown>;
}

const SINCE: Since[] = [
  {
    name: "new-application",
    trigger: newApplication,
    url: "https://api.ashbyhq.com/application.list",
    list: "applications",
    body: { status: ["Active", "Hired", "Archived"] },
    item: (id, ms) => ({ id, status: "Active", createdAt: iso(ms) }),
  },
  {
    name: "new-application-feedback",
    trigger: newApplicationFeedback,
    url: "https://api.ashbyhq.com/applicationFeedback.list",
    list: "submissions",
    body: {},
    item: (id, ms) => ({ id, applicationId: "app-1", submittedAt: iso(ms) }),
  },
  {
    name: "new-interview-schedule",
    trigger: newInterviewSchedule,
    url: "https://api.ashbyhq.com/interviewSchedule.list",
    list: "schedules",
    body: {},
    item: (id, ms) => ({ id, applicationId: "app-1", createdAt: iso(ms) }),
  },
  {
    name: "new-job",
    trigger: newJob,
    url: "https://api.ashbyhq.com/job.list",
    list: "jobs",
    body: {},
    item: (id, ms) => ({ id, title: "Engineer", createdAt: iso(ms) }),
  },
  {
    name: "new-offer",
    trigger: newOffer,
    url: "https://api.ashbyhq.com/offer.list",
    list: "offers",
    body: {},
    item: (id, ms) => ({ id, applicationId: "app-1", latestVersion: { createdAt: iso(ms) } }),
  },
];

let seq = 0;
const page = (items: unknown[], more = false, n = 1): MockResponse => ({
  body: {
    success: true,
    results: items,
    moreDataAvailable: more,
    nextCursor: more ? `c${n}` : null,
  },
});
const pages = (c: Since, count: number, ms: number): MockResponse[] =>
  Array.from(
    { length: count },
    (_, i) =>
      page(Array.from({ length: 100 }, () => c.item(`r${++seq}`, ms)), i < count - 1, i + 1),
  );

const ids = (events: unknown[]): string[] => events.map((e) => (e as { id: string }).id);

const run = async (
  t: TriggerDefinition,
  state: unknown,
  now: number,
  responses: MockResponse[],
) => {
  clock.now = () => now;
  const m = mockCtx(responses);
  return { ...(await t.poll!({ ...input, state }, m.ctx)), calls: m.calls };
};

for (const c of SINCE) {
  const one = (items: unknown[]) => page(items);

  test(`${c.name}: seed emits nothing, a new record fires once, retry is idempotent`, async () => {
    const seeded = await run(c.trigger, {}, T0, [one([c.item("old", OLD)])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);
    const fresh = c.item("fresh", T0 + 60_000);
    const responses = [one([fresh, c.item("old", OLD)])];
    const a = await run(c.trigger, seeded.nextState, T0 + 300_000, responses);
    const b = await run(c.trigger, seeded.nextState, T0 + 300_000, responses);
    assertEquals(ids(a.events), ["fresh"]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
  });

  test(`${c.name}: sends the literal list request with the rolling createdAfter`, async () => {
    const seeded = await run(c.trigger, {}, T0, [one([])]);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "POST");
    assertEquals(seeded.calls[0].url, c.url);
    assertEquals(JSON.parse(seeded.calls[0].body!), {
      ...c.body,
      createdAfter: 1_799_999_880_000, // T0 - 120_000
      limit: 100,
    });
    const next = await run(c.trigger, seeded.nextState, T0 + 300_000, [one([])]);
    assertEquals(next.calls.length, 1);
    assertEquals(next.calls[0].url, c.url);
    assertEquals(JSON.parse(next.calls[0].body!), {
      ...c.body,
      createdAfter: T0 - OVERLAP, // the seed's cursor (T0) minus the 120 s overlap, as ms
      limit: 100,
    });
    assertEquals(JSON.parse(next.calls[0].body!).createdAfter, 1_799_999_880_000);
  });

  test(`${c.name}: records that predate the seed never fire, even over several pages (9.9)`, async () => {
    const seeded = await run(c.trigger, {}, T0, [one([c.item("old", OLD)])]);
    const flood = await run(c.trigger, seeded.nextState, T0 + 300_000, pages(c, 6, OLD));
    assertEquals(flood.calls.length, 6);
    assertEquals(flood.events, []);
    const fresh = c.item("after-seed", T0 + 400_000);
    const next = await run(c.trigger, flood.nextState, T0 + 600_000, [
      one([c.item("old2", OLD), fresh]),
    ]);
    assertEquals(ids(next.events), ["after-seed"]);
  });

  test(`${c.name}: a 6-page window is read whole, emitted once, and the cursor advances (9.8)`, async () => {
    const seeded = await run(c.trigger, {}, T0, [one([c.item("old", OLD)])]);
    const window = pages(c, 6, T0 + 100_000);
    const r1 = await run(c.trigger, seeded.nextState, T0 + 300_000, window);
    assertEquals(r1.calls.length, 6);
    assertEquals(r1.events.length, 600);
    assertEquals(new Set(r1.events.map((e) => (e as { id: string }).id)).size, 600);
    assertEquals((r1.nextState as { cursor?: number }).cursor, T0 + 300_000);
    assertEquals((r1.nextState as { resume?: unknown }).resume, undefined);
    const r2 = await run(c.trigger, r1.nextState, T0 + 600_000, window);
    assertEquals(r2.events, []);
  });
}

interface Snap {
  name: string;
  trigger: TriggerDefinition;
  url: string;
  list: string;
  /** The literal request body (job postings are not paged, so no limit). */
  body: Record<string, unknown>;
  item: (id: string) => Record<string, unknown>;
}

const SNAP: Snap[] = [
  {
    name: "new-user",
    trigger: newUser,
    url: "https://api.ashbyhq.com/user.list",
    list: "users",
    body: { limit: 100 },
    item: (id) => ({ id, firstName: "Pat", email: `${id}@example.com` }),
  },
  {
    name: "new-job-posting",
    trigger: newJobPosting,
    url: "https://api.ashbyhq.com/jobPosting.list",
    list: "postings",
    body: { listedOnly: true },
    item: (id) => ({ id, title: "Engineer", jobId: "job-1" }),
  },
];

for (const c of SNAP) {
  test(`${c.name}: seed, one added record, idempotent retry`, async () => {
    const one = c.item("a");
    const seeded = await run(c.trigger, {}, T0, [page([one])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const added = c.item("b");
    const responses = [page([one, added])];
    const a = await run(c.trigger, seeded.nextState, T0 + 300_000, responses);
    const b = await run(c.trigger, seeded.nextState, T0 + 300_000, responses);
    assertEquals(a.events, [added]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
    // A removed record is not an event, and an unchanged snapshot emits nothing.
    const again = await run(c.trigger, a.nextState, T0 + 600_000, [page([added])]);
    assertEquals(again.events, []);
  });

  test(`${c.name}: sends the literal list request`, async () => {
    const seeded = await run(c.trigger, {}, T0, [page([])]);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "POST");
    assertEquals(seeded.calls[0].url, c.url);
    assertEquals(JSON.parse(seeded.calls[0].body!), c.body);
  });
}

test("every new trigger declares output, sample and a poll floor, and no onSubscribe", () => {
  for (const t of [...SINCE.map((c) => c.trigger), ...SNAP.map((c) => c.trigger)]) {
    assertEquals(t.poll !== undefined && t.onSubscribe === undefined, true, t.key);
    assertEquals((t.output ?? []).length > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    assertEquals((t.minIntervalMs ?? 0) >= 60_000, true, t.key);
  }
});
