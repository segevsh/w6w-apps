import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits a new contact, retries idempotently, and uses the newest-first feed", async () => {
  const first = { contactID: "c1" };
  const second = { contactID: "c2" };
  const seed = mockCtx([{ body: { contacts: [first] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: { contacts: [second, first] } }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: { contacts: [second, first] } }]);
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
    path: "/api/contacts",
    query: { limit: "100", sort: "createdAt", direction: "desc" },
  });
});
