import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-conversation.ts";

test("new-conversation seeds, emits a new conversation, retries idempotently, and uses the newest-first feed", async () => {
  const first = { uid: "c1" };
  const second = { uid: "c2" };
  const page = (items: unknown[]) => ({ data: items, metadata: { nextCursor: null } });
  const seed = mockCtx([{ body: page([first]) }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: page([second, first]) }]);
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, fresh.ctx);
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: page([second, first]) }]);
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState } as never, retry.ctx),
    result,
  );
  const url = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  }, { method: "GET", path: "/v4/conversations", query: { limit: "100", order: "desc" } });
});
