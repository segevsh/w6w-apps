import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-request.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ request_id: id });
const response = (items: unknown[]) => ({ body: { requests: items } });
const opts = { display: { projectId: "proj_1" } };
const BASE = "https://api.deepgram.com/v1/projects/proj_1/requests?start=2023-11-14&end=2023-11-14";

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
