import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-incident.ts";

test("new-incident seeds, emits a new incident, retries idempotently, and uses the newest-first feed", async () => {
  const first = { id: "P1" };
  const second = { id: "P2" };
  const seed = mockCtx([{ body: { incidents: [first], more: false } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: { incidents: [second, first], more: false } }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: { incidents: [second, first], more: false } }]);
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState } as never, retry.ctx),
    result,
  );
  const url = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, {
    method: "GET",
    path: "/incidents",
    query: { sort_by: "created_at:desc", limit: "100", offset: "0" },
  });
});
