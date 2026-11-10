import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-index.ts";

const input = { params: {}, subscriptionId: "sub-1" };

test("new-index: seeds without emitting and requests GET /indexes", async () => {
  const seed = mockCtx([{ body: { indexes: [{ name: "idx-1", dimension: 3 }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.pinecone.io/indexes");
});

test("new-index: emits only an added row, retries idempotently, ignores an edited row", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { indexes: [{ name: "idx-1", dimension: 3 }] } }]).ctx,
  );
  const page = { indexes: [{ name: "idx-2", dimension: 3 }, { name: "idx-1", dimension: 3 }] };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events, [{
    change: "added",
    key: "idx-2",
    values: { name: "idx-2", dimension: 3 },
  }]);
  assertEquals(await run(), first);
  const edited = { indexes: [{ name: "idx-2", dimension: 3 }, { name: "idx-1", dimension: 9 }] };
  const noUpdate = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: edited }]).ctx,
  );
  assertEquals(noUpdate.events, []);
});
