import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listPage, mockCtx } from "../_helpers.ts";
import { clock, pollTriggers } from "../../triggers/poll.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for every since-filter trigger in triggers/poll.ts.
const endpoints: Record<string, string> = {
  "application-stage": "application_stages",
  application: "applications",
  attachment: "attachments",
  candidate: "candidates",
  department: "departments",
  "job-interview-stage": "job_interview_stages",
  "job-post": "job_posts",
  job: "jobs",
  note: "notes",
  offer: "offers",
  office: "offices",
  opening: "openings",
  "rejection-reason": "rejection_reasons",
  scorecard: "scorecards",
  source: "sources",
  user: "users",
  interview: "interviews",
};
const input = { params: {}, subscriptionId: "sub-1" };
const realNow = clock.now;
const setNow = (iso: string) => {
  clock.now = () => Date.parse(iso);
};
const idOf = (e: unknown) => String((e as { id: string }).id);

for (const trigger of pollTriggers) {
  const field = trigger.key.startsWith("new-or-updated-") ? "updated_at" : "created_at";
  const endpoint = endpoints[trigger.key.replace("new-or-updated-", "").replace("new-", "")]!;
  const mk = (id: string, iso: string) => ({ id, [field]: iso });
  const fullPage = (n: number, iso: string, more: boolean) =>
    listPage(
      Array.from({ length: 100 }, (_, i) => mk(`p${n}-${i}`, iso)),
      more ? `tok${n}` : undefined,
    );

  test(`${trigger.key}: records that existed at the seed are never emitted, however many pages the window holds`, async () => {
    try {
      setNow("2026-11-09T12:00:00Z");
      const seed = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
      assertEquals(seed.events, []);
      setNow("2026-11-09T12:05:00Z");
      const r1 = await trigger.poll!(
        { ...input, state: seed.nextState },
        mockCtx([1, 2, 3, 4, 5].map((k) => fullPage(k, "2026-11-09T11:59:00Z", true))).ctx,
      );
      assertEquals(r1.events, []);
      const r2 = await trigger.poll!(
        { ...input, state: r1.nextState },
        mockCtx([fullPage(99, "2026-11-09T11:59:30Z", false)]).ctx,
      );
      assertEquals(r2.events, []);
      setNow("2026-11-09T12:10:00Z");
      const fresh = mk("fresh", "2026-11-09T12:06:00Z");
      const r3 = await trigger.poll!(
        { ...input, state: r2.nextState },
        mockCtx([listPage([fresh])]).ctx,
      );
      assertEquals(r3.events, [fresh]);
    } finally {
      clock.now = realNow;
    }
  });

  test(`${trigger.key}: a window of 5+1 full pages is emitted once across two checks and the cursor advances after the drain`, async () => {
    const start = Date.parse("2026-11-09T11:00:00Z");
    const state = { v: 1, kind: "ids", seeded: true, ids: ["old"], cursor: start };
    const seen: string[] = [];
    try {
      setNow("2026-11-09T11:30:00Z");
      const c1 = mockCtx(
        Array.from({ length: 5 }, (_, i) => fullPage(i + 1, "2026-11-09T11:10:00Z", true)),
      );
      const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
      assertEquals(c1.calls.length, 5);
      assertEquals(
        c1.calls[0].url,
        `https://harvest.greenhouse.io/v3/${endpoint}?per_page=100&${field}=gte%7C2026-11-09T10%3A58%3A00.000Z`,
      );
      assertEquals(
        c1.calls[1].url,
        `https://harvest.greenhouse.io/v3/${endpoint}?cursor=tok1`,
      );
      seen.push(...r1.events.map(idOf));
      const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assertEquals(mid.resume?.pos, "tok5");
      assertEquals(mid.cursor, start);
      setNow("2026-11-09T11:35:00Z");
      const c2 = mockCtx([fullPage(6, "2026-11-09T11:12:00Z", false)]);
      const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
      assertEquals(c2.calls.length, 1);
      assertEquals(c2.calls[0].url, `https://harvest.greenhouse.io/v3/${endpoint}?cursor=tok5`);
      seen.push(...r2.events.map(idOf));
      const next = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
      assertEquals(next.resume, undefined);
      assertEquals(seen.length, 600);
      assertEquals(new Set(seen).size, 600);
    } finally {
      clock.now = realNow;
    }
  });
}
