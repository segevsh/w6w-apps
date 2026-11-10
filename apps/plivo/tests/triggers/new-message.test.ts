import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { CONN, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

// Brief 9.8 (no stall) and 9.9 (seed floor) for new-message. Stamps carry the account's wall clock + offset.
const input = { params: {}, subscriptionId: "sub-1" };
const realNow = Date.now;
const setNow = (iso: string) => {
  Date.now = () => Date.parse(iso);
};
const wall = (iso: string, off: string) => {
  const sign = off[0] === "-" ? -1 : 1;
  const mins = sign * (+off.slice(1, 3) * 60 + +off.slice(4, 6));
  const w = new Date(Date.parse(iso) + mins * 60_000).toISOString().slice(0, 19).replace("T", " ");
  return `${w}${off}`;
};
const mk = (id: string, iso: string, off = "+05:30") => ({
  message_uuid: id,
  message_time: wall(iso, off),
});
const page = (items: unknown[]) => ({ body: { api_id: "a", meta: {}, objects: items } });
const full = (n: number, iso: string, off = "+05:30") =>
  page(Array.from({ length: 20 }, (_, i) => mk(`p${n}-${i}`, iso, off)));
const idOf = (e: unknown) => (e as { message_uuid: string }).message_uuid;
const base = "https://api.plivo.com/v1/Account/MA_TEST/Message/?";

test("new-message: seeding reads nothing; records from before it are never emitted, however many pages", async () => {
  try {
    setNow("2026-11-09T12:00:00Z");
    const seed = mockCtx([], CONN);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls.length, 0);
    setNow("2026-11-09T12:05:00Z");
    const old = mockCtx([
      full(1, "2026-11-09T11:59:00Z"),
      full(2, "2026-11-09T11:59:00Z"),
      full(3, "2026-11-09T11:59:00Z"),
    ], CONN);
    const r1 = await trigger.poll!({ ...input, state: seeded.nextState }, old.ctx);
    assertEquals(r1.events, []);
    assertEquals(old.calls.length, 3);
    // Offset not yet known: the bound is widened by 14h so a negative-offset account is not excluded.
    assertEquals(
      old.calls[0].url,
      `${base}message_time__gt=2026-11-08+21%3A58%3A00&limit=20&offset=0`,
    );
    assertEquals(old.calls[2].url.endsWith("&limit=20&offset=40"), true);
    setNow("2026-11-09T12:10:00Z");
    const fresh = mk("fresh", "2026-11-09T12:06:00Z");
    const next = mockCtx([page([fresh])], CONN);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, next.ctx);
    assertEquals(r2.events, [fresh]);
  } finally {
    Date.now = realNow;
  }
});

test("new-message: a negative-offset account is read from the earlier (wall clock) bound, and its new records emit", async () => {
  try {
    setNow("2026-11-09T12:00:00Z");
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([], CONN).ctx);
    setNow("2026-11-09T12:05:00Z");
    const r1 = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page([mk("a", "2026-11-09T11:00:00Z", "-05:00")])], CONN).ctx,
    );
    assertEquals(r1.events, []);
    assertEquals((r1.nextState as { offsetMin?: number }).offsetMin, -300);
    setNow("2026-11-09T12:10:00Z");
    const fresh = mk("b", "2026-11-09T12:07:00Z", "-05:00");
    const c = mockCtx([page([fresh])], CONN);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c.ctx);
    assertEquals(r2.events, [fresh]);
    // cursor 12:05Z - 2min = 12:03Z, read in the -05:00 wall clock = 07:03.
    assertEquals(
      c.calls[0].url,
      `${base}message_time__gt=2026-11-09+07%3A03%3A00&limit=20&offset=0`,
    );
  } finally {
    Date.now = realNow;
  }
});

test("new-message: a window of 3 full pages plus more is emitted once across two checks, cursor advancing after the drain", async () => {
  const start = Date.parse("2026-11-09T11:00:00Z");
  const state = {
    v: 1,
    kind: "ids",
    seeded: true,
    ids: ["old"],
    cursor: start,
    floor: start,
    offsetMin: 330,
  };
  const seen: string[] = [];
  try {
    setNow("2026-11-09T11:30:00Z");
    const c1 = mockCtx([1, 2, 3].map((n) => full(n, "2026-11-09T11:10:00Z")), CONN);
    const r1 = await trigger.poll!({ ...input, state }, c1.ctx);
    assertEquals(c1.calls.length, 3);
    seen.push(...r1.events.map(idOf));
    const mid = r1.nextState as { cursor?: number; resume?: { pos?: unknown } };
    assertEquals(mid.resume?.pos, 60);
    assertEquals(mid.cursor, start);
    setNow("2026-11-09T11:35:00Z");
    const c2 = mockCtx([page([mk("tail", "2026-11-09T11:29:00Z")])], CONN);
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(c2.calls.length, 1);
    assertEquals(c2.calls[0].url.endsWith("&limit=20&offset=60"), true);
    seen.push(...r2.events.map(idOf));
    const next = r2.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T11:30:00Z"));
    assertEquals(next.resume, undefined);
    assertEquals(seen.length, 61);
    assertEquals(new Set(seen).size, 61);
  } finally {
    Date.now = realNow;
  }
});
