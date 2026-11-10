import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-recording.ts";
import { clock } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const input = { params: {}, subscriptionId: "sub-1" };
const PRE = "2026-11-09T11:59:30.000Z"; // before the seed, inside the overlap window
const POST = "2026-11-09T12:03:00.000Z";
const rec = (uuid: string, start: string) => ({ uuid, start_time: start, topic: "t" });
const page = (meetings: unknown[], token = "") => ({
  body: { meetings, next_page_token: token, page_size: 100 },
});
const next = (r: unknown) => (r as { nextState: unknown }).nextState;
const events = (r: unknown) => (r as { events: unknown[] }).events;
const seed = async () => {
  clock.now = () => T0;
  const c = mockCtx([]);
  const r = await trigger.poll!({ ...input, state: {} } as never, c.ctx);
  return { r, calls: c.calls };
};

test("new-recording: first check seeds without a request or events", async () => {
  const { r, calls } = await seed();
  assertEquals(events(r), []);
  assertEquals((next(r) as { seeded?: boolean }).seeded, true);
  assertEquals(calls.length, 0);
});

test("new-recording: emits the new recording once; a retry is identical; request is literal", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const body = page([rec("new-1", POST)]);
  const c = mockCtx([body]);
  const first = await trigger.poll!({ ...input, state: next(seeded) } as never, c.ctx);
  const retry = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([body]).ctx,
  );
  assertEquals(events(first), [rec("new-1", POST)]);
  assertEquals(retry, first);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(
    c.calls[0].url,
    "https://api.zoom.us/v2/users/me/recordings?from=2026-11-09&to=2026-11-09&page_size=100",
  );
});

test("new-recording: a window longer than maxPages is resumed with the page token, then drains", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const mk = (p: number, n: number) => Array.from({ length: n }, (_, i) => rec(`r${p}-${i}`, POST));
  const c1 = mockCtx([page(mk(0, 50), "t0"), page(mk(1, 50), "t1"), page(mk(2, 50), "t2")]);
  const a = await trigger.poll!({ ...input, state: next(seeded) } as never, c1.ctx);
  assertEquals(events(a).length, 150);
  assertEquals(c1.calls.length, 3);
  assertEquals((next(a) as { resume?: unknown }).resume !== undefined, true);
  clock.now = () => T1 + 300_000;
  const c2 = mockCtx([page(mk(3, 5))]);
  const b = await trigger.poll!({ ...input, state: next(a) } as never, c2.ctx);
  assertEquals(c2.calls.length, 1);
  assertEquals(new URL(c2.calls[0].url).searchParams.get("next_page_token"), "t2");
  assertEquals(events(b).length, 5);
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
  const all = [...events(a), ...events(b)] as { uuid: string }[];
  assertEquals(new Set(all.map((x) => x.uuid)).size, 155);
});

test("new-recording: an expired page token restarts the window instead of stalling", async () => {
  const { r: seeded } = await seed();
  clock.now = () => T1;
  const mk = (p: number) => Array.from({ length: 50 }, (_, i) => rec(`r${p}-${i}`, POST));
  const a = await trigger.poll!(
    { ...input, state: next(seeded) } as never,
    mockCtx([page(mk(0), "t0"), page(mk(1), "t1"), page(mk(2), "t2")]).ctx,
  );
  clock.now = () => T1 + 300_000;
  const b = await trigger.poll!(
    { ...input, state: next(a) } as never,
    mockCtx([
      { status: 400, body: { code: 300, message: "Invalid next_page_token." } },
      page(mk(0)),
    ])
      .ctx,
  );
  assertEquals(events(b).length, 0); // the restarted page repeats ids already emitted
  assertEquals((next(b) as { resume?: unknown }).resume, undefined);
});

test("new-recording: records from before the seed are never emitted; one after it is (seed floor)", async () => {
  const { r: seeded } = await seed();
  const pre = [0, 1, 2, 3].map((p) =>
    Array.from({ length: 50 }, (_, i) => rec(`pre${p}-${i}`, PRE))
  );
  let state = next(seeded);
  let emitted = 0;
  let now = T1;
  for (
    const responses of [
      [page(pre[0], "c0"), page(pre[1], "c1"), page(pre[2], "c2")],
      [page(pre[3])],
    ]
  ) {
    clock.now = () => now;
    const r = await trigger.poll!({ ...input, state } as never, mockCtx(responses).ctx);
    emitted += events(r).length;
    state = next(r);
    now += 300_000;
  }
  assertEquals(emitted, 0);
  clock.now = () => now;
  const post = rec("post-1", "2026-11-09T12:09:00.000Z");
  const r = await trigger.poll!({ ...input, state } as never, mockCtx([page([post])]).ctx);
  assertEquals(events(r), [post]);
});
