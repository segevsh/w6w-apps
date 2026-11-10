import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import { clock } from "../../lib/triggers.ts";
import newFeedback from "../../triggers/new-feedback.ts";
import newReview from "../../triggers/new-review.ts";
import newReviewInvite from "../../triggers/new-review-invite.ts";
import newOrUpdatedAppointment from "../../triggers/new-or-updated-appointment.ts";
import newOrUpdatedCall from "../../triggers/new-or-updated-call.ts";
import newOrUpdatedCampaign from "../../triggers/new-or-updated-campaign.ts";
import newOrUpdatedContact from "../../triggers/new-or-updated-contact.ts";
import newOrUpdatedReview from "../../triggers/new-or-updated-review.ts";
import newLocation from "../../triggers/new-location.ts";
import newUser from "../../triggers/new-user.ts";

// Round 3 poll triggers over Podium list actions, table-driven. Feeds get the brief 5 cases (+ 9.2
// for the edit-stamped ones), since-filter triggers also 9.8 / 9.9, snapshots 5 + paging. Every
// request URL below is written out by hand.
const API = "https://api.podium.com/v4";
const T0 = 1_800_000_000_000; // 2027-01-15T08:00:00.000Z, the seed instant
const OLD = T0 - 3_600_000;
const iso = (ms: number): string => new Date(ms).toISOString();
const input = { params: {}, subscriptionId: "sub" };
const page = (items: unknown[], next: string | null = null): MockResponse => ({
  body: { data: items, metadata: { nextCursor: next } },
});
const run = async (t: TriggerDefinition, state: unknown, responses: MockResponse[], now = T0) => {
  clock.now = () => now;
  const m = mockCtx(responses);
  return { ...(await t.poll!({ ...input, state } as never, m.ctx)), calls: m.calls };
};
const uids = (events: unknown[]): string[] => events.map((e) => (e as { uid: string }).uid);

interface Feed {
  name: string;
  trigger: TriggerDefinition;
  url: string;
  /** Edit stamp field when the id carries it (new-or-updated). */
  stamp?: string;
}

const FEEDS: Feed[] = [
  { name: "new-feedback", trigger: newFeedback, url: `${API}/feedback?limit=100` },
  { name: "new-review", trigger: newReview, url: `${API}/reviews?limit=100` },
  { name: "new-review-invite", trigger: newReviewInvite, url: `${API}/reviews/invites?limit=100` },
  {
    name: "new-or-updated-appointment",
    trigger: newOrUpdatedAppointment,
    url: `${API}/appointments?limit=100&order=desc`,
    stamp: "updatedAt",
  },
  {
    name: "new-or-updated-call",
    trigger: newOrUpdatedCall,
    url: `${API}/calls?limit=100&order=desc`,
    stamp: "updatedAt",
  },
  {
    name: "new-or-updated-campaign",
    trigger: newOrUpdatedCampaign,
    url: `${API}/campaigns`,
    stamp: "updatedAt",
  },
];

for (const f of FEEDS) {
  const rec = (uid: string, v = "s1") => (f.stamp ? { uid, [f.stamp]: v } : { uid });

  test(`${f.name}: seed emits nothing, a new record fires once, retry is idempotent`, async () => {
    const seeded = await run(f.trigger, {}, [page([rec("2"), rec("1")])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const responses = [page([rec("3"), rec("2"), rec("1")])];
    const a = await run(f.trigger, seeded.nextState, responses);
    const b = await run(f.trigger, seeded.nextState, responses);
    assertEquals(a.events, [rec("3")]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
    assertEquals((await run(f.trigger, a.nextState, responses)).events, []);
  });

  test(`${f.name}: sends the literal list request`, async () => {
    const r = await run(f.trigger, {}, [page([rec("1")])]);
    assertEquals(r.calls.length, 1);
    assertEquals(r.calls[0].method, "GET");
    assertEquals(r.calls[0].url, f.url);
  });

  if (f.stamp) {
    test(`${f.name}: an edited record is a new event, an untouched one is not (9.2)`, async () => {
      const seeded = await run(f.trigger, {}, [page([rec("1", "s1")])]);
      const edited = await run(f.trigger, seeded.nextState, [page([rec("1", "s2")])]);
      assertEquals(edited.events, [rec("1", "s2")]);
      const same = await run(f.trigger, seeded.nextState, [page([rec("1", "s1")])]);
      assertEquals(same.events, []);
    });
  }
}

interface Since {
  name: string;
  trigger: TriggerDefinition;
  path: string;
  /** The literal first-page URL for a window starting 2027-01-15T07:58:00.000Z. */
  url: string;
}

const SINCE: Since[] = [
  {
    name: "new-or-updated-contact",
    trigger: newOrUpdatedContact,
    path: "contacts",
    url: `${API}/contacts?limit=100&updated_at=2027-01-15T07%3A58%3A00.000Z`,
  },
  {
    name: "new-or-updated-review",
    trigger: newOrUpdatedReview,
    path: "reviews",
    url: `${API}/reviews?limit=100&updatedAt%5Bgte%5D=2027-01-15T07%3A58%3A00.000Z`,
  },
];

let seq = 0;
const rec = (ms: number) => ({ uid: `r${++seq}`, updatedAt: iso(ms) });
const pages = (count: number, ms: number): MockResponse[] =>
  Array.from(
    { length: count },
    (_, i) =>
      page(Array.from({ length: 100 }, () => rec(ms)), i < count - 1 ? `cursor-${i + 1}` : null),
  );

for (const s of SINCE) {
  test(`${s.name}: seed, one new/edited record, idempotent retry`, async () => {
    const seeded = await run(s.trigger, {}, [page([rec(OLD)])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);
    const fresh = rec(T0 + 60_000);
    const responses = [page([fresh, rec(OLD)])];
    const a = await run(s.trigger, seeded.nextState, responses, T0 + 300_000);
    const b = await run(s.trigger, seeded.nextState, responses, T0 + 300_000);
    assertEquals(a.events, [fresh]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
  });

  test(`${s.name}: an edited record is a new event (9.2)`, async () => {
    const seeded = await run(s.trigger, {}, [page([])]);
    const before = { uid: "same", updatedAt: iso(T0 + 60_000) };
    const first = await run(s.trigger, seeded.nextState, [page([before])], T0 + 300_000);
    assertEquals(uids(first.events), ["same"]);
    const edited = { uid: "same", updatedAt: iso(T0 + 400_000) };
    const second = await run(s.trigger, first.nextState, [page([edited, before])], T0 + 600_000);
    assertEquals(second.events, [edited]);
  });

  test(`${s.name}: sends the literal request with the rolling updated-after filter`, async () => {
    const seeded = await run(s.trigger, {}, [page([])]);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, s.url);
    const next = await run(s.trigger, seeded.nextState, [page([])], T0 + 300_000);
    assertEquals(next.calls[0].url, s.url); // cursor = seed instant, so the same window start
  });

  test(`${s.name}: records that predate the seed never fire, even over several pages (9.9)`, async () => {
    const seeded = await run(s.trigger, {}, [page([rec(OLD)])]);
    const c1 = await run(s.trigger, seeded.nextState, pages(6, OLD).slice(0, 5), T0 + 300_000);
    assertEquals(c1.calls.length, 5);
    assertEquals(c1.events, []);
    const c2 = await run(s.trigger, c1.nextState, pages(6, OLD).slice(5), T0 + 600_000);
    assertEquals(c2.events, []);
    const fresh = rec(T0 + 700_000);
    const c3 = await run(s.trigger, c2.nextState, [page([rec(OLD), fresh])], T0 + 900_000);
    assertEquals(c3.events, [fresh]);
  });

  test(`${s.name}: a 6-page window (maxPages 5 + 1) resumes, emits all once, then advances the cursor (9.8)`, async () => {
    const seeded = await run(s.trigger, {}, [page([rec(OLD)])]);
    const window = pages(6, T0 + 100_000);
    const c1 = await run(s.trigger, seeded.nextState, window.slice(0, 5), T0 + 300_000);
    assertEquals(c1.calls.length, 5);
    assertEquals(c1.events.length, 500);
    // The check stopped mid-window: the resume position is kept and the cursor has not moved.
    assertEquals((c1.nextState as { cursor?: number }).cursor, T0);
    assertEquals(
      (c1.nextState as { resume?: { pos?: string } }).resume?.pos,
      "cursor-5",
    );
    const c2 = await run(s.trigger, c1.nextState, window.slice(5), T0 + 600_000);
    // The resumed read sends only the saved cursor (Podium: a cursor overrides every other filter).
    assertEquals(
      c2.calls[0].url,
      `${API}/${s.path}?limit=100&cursor=cursor-5`,
    );
    assertEquals(c2.events.length, 100);
    assertEquals((c2.nextState as { cursor?: number }).cursor, T0 + 300_000);
    assertEquals((c2.nextState as { resume?: unknown }).resume, undefined);
    const all = [...c1.events, ...c2.events];
    assertEquals(new Set(uids(all)).size, 600);
  });
}

interface Snap {
  name: string;
  trigger: TriggerDefinition;
  path: string;
}

const SNAPS: Snap[] = [
  { name: "new-location", trigger: newLocation, path: "locations" },
  { name: "new-user", trigger: newUser, path: "users" },
];

for (const s of SNAPS) {
  test(`${s.name}: seed over two pages, one added record, idempotent retry, literal requests`, async () => {
    const seeded = await run(s.trigger, {}, [page([{ uid: "a" }], "c1"), page([{ uid: "b" }])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls.map((c) => c.url), [
      `${API}/${s.path}?limit=100`,
      `${API}/${s.path}?limit=100&cursor=c1`,
    ]);
    const responses = [page([{ uid: "a" }, { uid: "b" }, { uid: "c" }])];
    const a = await run(s.trigger, seeded.nextState, responses, T0 + 300_000);
    const b = await run(s.trigger, seeded.nextState, responses, T0 + 300_000);
    assertEquals(a.events, [{ uid: "c" }]);
    assertEquals({ ...a, calls: 0 }, { ...b, calls: 0 });
    assertEquals((await run(s.trigger, a.nextState, responses)).events, []);
  });

  test(`${s.name}: a list longer than the snapshot ceiling fails loudly`, async () => {
    const full = Array.from({ length: 10 }, (_, i) => page([{ uid: `u${i}` }], `c${i}`));
    let error = "";
    try {
      await run(s.trigger, {}, full);
    } catch (e) {
      error = (e as Error).message;
    }
    assertEquals(error, `${s.name}: more than 1000 records; a snapshot cannot be taken`);
  });
}

test("every new trigger declares output, sample and a poll floor, and no onSubscribe", () => {
  const all = [
    ...FEEDS.map((f) => f.trigger),
    ...SINCE.map((s) => s.trigger),
    ...SNAPS.map((s) => s.trigger),
  ];
  assertEquals(all.length, 10);
  for (const t of all) {
    assertEquals(t.poll !== undefined && t.onSubscribe === undefined, true, t.key);
    assertEquals((t.output ?? []).length > 0, true, t.key);
    assertEquals(t.sample !== undefined, true, t.key);
    assertEquals((t.minIntervalMs ?? 0) >= 60_000, true, t.key);
  }
});
