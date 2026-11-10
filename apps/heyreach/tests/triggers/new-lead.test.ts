import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { jsonBody, mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-lead.ts";

test("new-lead seeds, emits, retries, and sends the createdFrom since-filter", async () => {
  const realNow = clock.now;
  clock.now = () => Date.parse("2026-11-10T12:00:00.000Z");
  try {
    const old = { id: "old" }, fresh = { id: "fresh" };
    const input = (state: unknown) => ({ params: { listId: 7 }, state }) as never;
    const seed = mockCtx([{ body: { items: [old] } }]);
    const seeded = await trigger.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    const result = await trigger.poll!(
      input(seeded.nextState),
      mockCtx([{ body: { items: [fresh, old] } }]).ctx,
    );
    assertEquals(result.events, [fresh]);
    assertEquals(
      await trigger.poll!(
        input(seeded.nextState),
        mockCtx([{ body: { items: [fresh, old] } }]).ctx,
      ),
      result,
    );
    assertEquals({
      method: seed.calls[0].method,
      url: seed.calls[0].url,
      body: jsonBody(seed.calls[0]),
    }, {
      method: "POST",
      url: "https://api.heyreach.io/api/public/list/GetLeadsFromList",
      body: { listId: 7, createdFrom: "2026-11-10T11:58:00.000Z", limit: 100, offset: 0 },
    });
  } finally {
    clock.now = realNow;
  }
});

test("new-lead persists the cursor and pages the whole window", async () => {
  const realNow = clock.now;
  const input = (state: unknown) => ({ params: { listId: 7 }, state }) as never;
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}` }));
  try {
    clock.now = () => Date.parse("2026-11-10T12:00:00.000Z");
    const first = mockCtx([{ body: { items: [] } }]);
    const seeded = await trigger.poll!(input({}), first.ctx);
    assertEquals(seeded.nextState.cursor, Date.parse("2026-11-10T12:00:00.000Z"));
    clock.now = () => Date.parse("2026-11-10T13:00:00.000Z");
    const second = mockCtx([{ body: { items: full } }, { body: { items: [{ id: "b" }] } }]);
    const result = await trigger.poll!(input(seeded.nextState), second.ctx);
    assertEquals(result.events.length, 101);
    assertEquals(result.nextState.cursor, Date.parse("2026-11-10T13:00:00.000Z"));
    assertEquals(second.calls.map((c) => jsonBody(c)), [
      { listId: 7, createdFrom: "2026-11-10T11:58:00.000Z", limit: 100, offset: 0 },
      { listId: 7, createdFrom: "2026-11-10T11:58:00.000Z", limit: 100, offset: 100 },
    ]);
  } finally {
    clock.now = realNow;
  }
});
