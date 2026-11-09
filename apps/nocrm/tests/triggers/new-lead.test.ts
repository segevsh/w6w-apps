import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNocrmCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

test("new-lead seeds, emits a new lead, retries idempotently, and uses the newest-first feed", async () => {
  const first = { id: 1 };
  const second = { id: 2 };
  const seed = mockNocrmCtx([{ body: [first] }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockNocrmCtx([{ body: [second, first] }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockNocrmCtx([{ body: [second, first] }]);
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
    path: "/api/v2/leads",
    query: { direction: "desc", order: "creation_date", limit: "100" },
  });
});
