import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { jsonBody, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

test("new-lead seeds, emits, retries, and requests the bounded list feed", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: { items: [old] } }]);
  const seeded = await trigger.poll!({ params: { listId: 7 }, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: { listId: 7 }, state: seeded.nextState } as never,
    mockCtx([{ body: { items: [fresh, old] } }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: { listId: 7 }, state: seeded.nextState } as never,
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
    body: { listId: 7, limit: 100, offset: 0 },
  });
});
