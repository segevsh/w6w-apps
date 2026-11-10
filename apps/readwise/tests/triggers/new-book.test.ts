import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-book.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-book: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ results: [{ id: "a" }], count: 1 });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://readwise.io/api/v2/books/?updated__gt=1970-01-01T00%3A00%3A00Z&page_size=100&page=1",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ results: [{ id: "b" }, { id: "a" }], count: 2 }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ results: [{ id: "b" }, { id: "a" }], count: 2 }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
