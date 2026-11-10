import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-request.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ request_id: id });
const response = (items: unknown[]) => ({ body: { requests: items } });
const opts = { display: { projectId: "proj_1" } };
const BASE = "https://api.deepgram.com/v1/projects/proj_1/requests?start=2023-11-13&end=2023-11-14";

test("new-request: seeds, emits new requests, retries idempotently, reads the day at limit 1000", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const seed = mockCtx([response([item("a")])], opts);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].url, `${BASE}&limit=1000`);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([response(page)], opts).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([response(page)], opts).ctx,
    );
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  } finally {
    clock.now = original;
  }
});

test("new-request: pages past 1000 requests and fails loudly at the 5000 cap", async () => {
  const original = clock.now;
  clock.now = () => 1_700_000_000_000;
  try {
    const full = (from: number) =>
      response(Array.from({ length: 1000 }, (_, i) => item(`r${from + i}`)));
    const seed = mockCtx([full(0), response([item("r1000")])], opts);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 2);
    assertEquals(seed.calls[0].url, `${BASE}&limit=1000`);
    assertEquals(seed.calls[1].url, `${BASE}&limit=1000&page=1`);
    const next = mockCtx([full(0), response([item("r1000"), item("r1001")])], opts);
    const out = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
    assertEquals(out.events, [item("r1001")]);

    const over = mockCtx([full(0), full(1000), full(2000), full(3000), full(4000)], opts);
    let message = "";
    try {
      await trigger.poll!({ ...input, state: {} }, over.ctx);
    } catch (err) {
      message = (err as Error).message;
    }
    assertEquals(over.calls.length, 5);
    assertEquals(message.includes("more than 5000 requests"), true);
  } finally {
    clock.now = original;
  }
});

test("new-request: a request logged before midnight is emitted once by the first poll after it", async () => {
  const original = clock.now;
  try {
    const mid =
      "https://api.deepgram.com/v1/projects/proj_1/requests?start=2023-11-14&end=2023-11-15&limit=1000";
    // Poll at 23:57:30 on the 14th seeds; poll at 00:02:30 on the 15th sees the 23:59:00 request.
    clock.now = () => Date.UTC(2023, 10, 14, 23, 57, 30);
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([response([item("old")])], opts).ctx,
    );
    clock.now = () => Date.UTC(2023, 10, 15, 0, 2, 30);
    const late = mockCtx([response([item("late-2359"), item("new-0000"), item("old")])], opts);
    const out = await trigger.poll!({ ...input, state: seeded.nextState }, late.ctx);
    assertEquals(late.calls[0].url, mid);
    assertEquals(out.events, [item("late-2359"), item("new-0000")]);
    // The next poll must not emit them again.
    clock.now = () => Date.UTC(2023, 10, 15, 0, 7, 30);
    const again = await trigger.poll!(
      { ...input, state: out.nextState },
      mockCtx([response([item("late-2359"), item("new-0000"), item("old")])], opts).ctx,
    );
    assertEquals(again.events, []);
  } finally {
    clock.now = original;
  }
});
