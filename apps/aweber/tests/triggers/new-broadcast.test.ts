import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-broadcast.ts";

const base = "https://api.aweber.com/1.0/accounts/1/lists/2/broadcasts?status=sent";
const input = { params: { accountId: "1", listId: "2" }, subscriptionId: "sub-1" };
const body = (ids: number[], total = ids.length) => ({
  body: { entries: ids.map((broadcast_id) => ({ broadcast_id })), total_size: total },
});

describe("new-broadcast", () => {
  test("seeds without emitting, emits only the addition, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([body([10])]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([body([10, 20])]).ctx);
    const first = await run();
    assertEquals(first.events.map((e) => (e as { key: string }).key), ["20"]);
    assertEquals((first.events[0] as { change: string }).change, "added");
    assertEquals(await run(), first);
  });

  test("sends status=sent for the chosen list as the literal request", async () => {
    const m = mockCtx([body([10])]);
    await trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, `${base}&ws.start=0&ws.size=100`);
  });

  test("reads the next page while the list holds more, and an addition on page 2 emits", async () => {
    const full = Array.from({ length: 100 }, (_, i) => i + 1);
    const seed = mockCtx([body(full, 101), body([101], 101)]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[1].url, `${base}&ws.start=100&ws.size=100`);
    const next = mockCtx([body(full, 102), body([101, 102], 102)]);
    const r = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
    assertEquals(r.events.map((e) => (e as { key: string }).key), ["102"]);
  });

  test("a sent broadcast whose stats change emits nothing", async () => {
    const withStats = (opens: number) => ({
      body: { entries: [{ broadcast_id: 10, total_opens: opens }], total_size: 1 },
    });
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([withStats(1)]).ctx);
    const r = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([withStats(9)]).ctx,
    );
    assertEquals(r.events, []);
  });

  test("requires the listId param", () => {
    const listId = (trigger.params ?? []).find((p) => p.key === "listId");
    assertEquals(listId?.required, true);
  });
});
