import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits a new contact, retries idempotently, and uses the newest-first feed", async () => {
  const first = { contact: { id: "c1" } };
  const second = { contact: { id: "c2" } };
  const seed = mockCtx([{ body: listEnvelope("contacts", [first]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: listEnvelope("contacts", [second, first]) }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: listEnvelope("contacts", [second, first]) }]);
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
    path: "/api/v3/contacts",
    query: { sort_by: "created_at", order: "desc", page: "1", per_page: "100" },
  });
});
