import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newChat from "../../triggers/new-chat.ts";
import newEmail from "../../triggers/new-email.ts";
import { clock } from "../../lib/triggers.ts";

// new-chat / new-email: created_after since-filter + next_cursor paging (no page size is sent).
const T0 = Date.UTC(2026, 10, 10, 0, 30, 0);
const OLD = T0 - 3_600_000;
const MAX_PAGES = 10;
const iso = (ms: number): string => new Date(ms).toISOString();
const rec = (id: string, at: number) => ({ id, created_at: iso(at) });
const pageOf = (items: unknown[], n: number, more = false): MockResponse => ({
  body: {
    success: true,
    data: { items, has_more: more, ...(more ? { next_cursor: `cur${n}` } : {}) },
  },
});
const full = (n: number, ts: number, last = false): MockResponse =>
  pageOf(Array.from({ length: last ? 1 : 25 }, (_, i) => rec(`n${n}-${i}`, ts)), n, !last);
const at = (ms: number): void => {
  clock.now = () => ms;
};
const realNow = clock.now;

const cases = [
  {
    name: "new-chat",
    trigger: newChat,
    params: { chatbotId: "bot1" },
    url: (sinceIso: string) =>
      `https://api.aidbase.ai/v1/chatbot/bot1/chats?created_after=${encodeURIComponent(sinceIso)}`,
  },
  {
    name: "new-email",
    trigger: newEmail,
    params: { emailInboxId: "inbox1", status: "open" },
    url: (sinceIso: string) =>
      `https://api.aidbase.ai/v1/email-inbox/inbox1/emails?status=open&created_after=${
        encodeURIComponent(sinceIso)
      }`,
  },
];

for (const { name, trigger, params, url } of cases) {
  const input = { params, subscriptionId: "sub-1" };
  const run = (state: unknown, responses: MockResponse[]) => {
    const m = mockCtx(responses);
    return trigger.poll!({ ...input, state }, m.ctx).then((r) => ({ ...r, calls: m.calls }));
  };
  const seed = async () => {
    at(T0);
    const seeded = await run({}, [pageOf([rec("seed-a", OLD)], 1)]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);
    return seeded;
  };

  test(`${name}: seeds, emits exactly the new record, retries idempotently, literal request`, async () => {
    try {
      const seeded = await seed();
      assertEquals(seeded.calls.length, 1);
      assertEquals(seeded.calls[0].method, "GET");
      assertEquals(seeded.calls[0].url, url("2026-11-10T00:28:00.000Z"));
      at(T0 + 60_000);
      const fresh = rec("fresh", T0 + 30_000);
      const again = () => run(seeded.nextState, [pageOf([fresh, rec("seed-a", OLD)], 1)]);
      const first = await again();
      assertEquals(first.events, [fresh]);
      assertEquals(first.calls[0].url, url("2026-11-10T00:28:00.000Z"));
      assertEquals(await again().then(({ events, nextState }) => ({ events, nextState })), {
        events: first.events,
        nextState: first.nextState,
      });
    } finally {
      clock.now = realNow;
    }
  });

  test(`${name}: records that predate the seed never fire, even over more than maxPages pages`, async () => {
    try {
      let state = (await seed()).nextState;
      at(T0 + 300_000);
      const r1 = await run(state, Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, OLD)));
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events, []);
      state = r1.nextState;
      at(T0 + 600_000);
      const r2 = await run(state, [full(MAX_PAGES + 1, OLD, true)]);
      assertEquals(r2.events, []);
      state = r2.nextState;
      at(T0 + 900_000);
      const fresh = rec("fresh", T0 + 400_000);
      const r3 = await run(state, [pageOf([rec("old-1", OLD), fresh], 1)]);
      assertEquals(r3.events, [fresh]);
    } finally {
      clock.now = realNow;
    }
  });

  test(`${name}: a window of maxPages + 1 pages is emitted once across checks, cursor advances after the drain`, async () => {
    try {
      let state = (await seed()).nextState;
      at(T0 + 300_000);
      const r1 = await run(
        state,
        Array.from({ length: MAX_PAGES }, (_, i) => full(i + 1, T0 + 100_000)),
      );
      assertEquals(r1.calls.length, MAX_PAGES);
      assertEquals(r1.events.length, MAX_PAGES * 25);
      assertEquals(
        r1.calls[MAX_PAGES - 1].url,
        url("2026-11-10T00:28:00.000Z") + `&next_cursor=cur${MAX_PAGES - 1}`,
      );
      const n1 = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
      assertEquals(n1.cursor, T0);
      assertEquals(n1.resume?.pos, `cur${MAX_PAGES}`);
      state = r1.nextState;
      at(T0 + 600_000);
      const r2 = await run(state, [full(MAX_PAGES + 1, T0 + 100_000, true)]);
      assertEquals(r2.calls.length, 1);
      assertEquals(
        r2.calls[0].url,
        url("2026-11-10T00:28:00.000Z") + `&next_cursor=cur${MAX_PAGES}`,
      );
      assertEquals(r2.events.length, 1);
      const n2 = r2.nextState as { cursor?: number; resume?: unknown };
      assertEquals(n2.cursor, T0 + 300_000);
      assertEquals(n2.resume, undefined);
      const all = [...r1.events, ...r2.events].map((e) => JSON.stringify(e));
      assertEquals(all.length, MAX_PAGES * 25 + 1);
      assertEquals(new Set(all).size, all.length);
    } finally {
      clock.now = realNow;
    }
  });
}
