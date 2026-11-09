import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits a new contact, retries idempotently, and uses the newest-first feed", async () => {
  const first = { id: "c1" };
  const second = { id: "c2" };
  const meta = { total: 1, page: 0, limit: 100, hasNext: false };
  const seed = mockCtx([{ body: envelope([first], meta) }]);
  const seeded = await trigger.poll!({ params: { funnelId: "f1" }, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: envelope([second, first], meta) }]);
  const result = await trigger.poll!(
    { params: { funnelId: "f1" }, state: seeded.nextState } as never,
    fresh.ctx,
  );
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: envelope([second, first], meta) }]);
  assertEquals(
    await trigger.poll!(
      { params: { funnelId: "f1" }, state: seeded.nextState } as never,
      retry.ctx,
    ),
    result,
  );
  const url = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, {
    method: "GET",
    path: "/v1/funnels/f1/contacts",
    query: { page: "0", limit: "100", sortField: "ps_converted_at", sortOrder: "-1" },
  });
});
