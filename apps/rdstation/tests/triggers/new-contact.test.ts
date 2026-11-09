import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits a new contact, retries idempotently, and uses the newest-first feed", async () => {
  const first = { _id: "c1" };
  const second = { _id: "c2" };
  const seed = mockCtx([{ body: envelope("contacts", [first]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: envelope("contacts", [second, first]) }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: envelope("contacts", [second, first]) }]);
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
    path: "/api/v1/contacts",
    query: { page: "1", limit: "100", order: "created_at", direction: "desc" },
  });
});
