import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-document.ts";

test("new-document seeds, emits a new document, retries idempotently, and uses the newest-first feed", async () => {
  const first = { id: 1 };
  const second = { id: 2 };
  const page = (results: unknown[]) => ({ count: results.length, current: 1, total: 1, results });
  const seed = mockCtx([{ body: page([first]) }]);
  const seeded = await trigger.poll!(
    { params: { mailboxId: "mb1" }, state: {} } as never,
    seed.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: page([second, first]) }]);
  const result = await trigger.poll!(
    { params: { mailboxId: "mb1" }, state: seeded.nextState } as never,
    fresh.ctx,
  );
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: page([second, first]) }]);
  assertEquals(
    await trigger.poll!(
      { params: { mailboxId: "mb1" }, state: seeded.nextState } as never,
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
    path: "/parser/mb1/document_set",
    query: { page: "1", page_size: "100", ordering: "-created" },
  });
});
