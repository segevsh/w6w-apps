import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-upsert.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

Deno.test("record-upsert: posts vectors to the index's own host", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: { upsertedCount: 2 } }]);
  const out = await action.execute!({
    indexName: "idx",
    namespace: "tenant-1",
    vectors: '[{"id":"a","values":[0.1,0.2]},{"id":"b","values":[0.3,0.4]}]',
  }, ctx);
  assertEquals(out, { upsertedCount: 2 });
  assertEquals(new URL(calls[1].url).host, "idx-abc.svc.aped-1.pinecone.io");
  assertEquals(new URL(calls[1].url).pathname, "/vectors/upsert");
  assertEquals(JSON.parse(calls[1].body!).namespace, "tenant-1");
});

/** Pinecone caps a batch at 1000 and rejects the WHOLE request over it. */
Deno.test("record-upsert: a batch over 1000 is refused before the wire", async () => {
  const { ctx, calls } = mockCtx();
  const many = Array.from({ length: 1001 }, (_, i) => ({ id: `v${i}`, values: [0.1] }));
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", vectors: JSON.stringify(many) }, ctx),
    Error,
    "1000",
  );
  assertEquals(calls.length, 0);
});

/**
 * A ragged batch is always a bug, and Pinecone reports it as a mismatch against
 * the INDEX, which sends people looking in the wrong place.
 */
Deno.test("record-upsert: mixed vector lengths are caught locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({
        indexName: "idx",
        vectors: '[{"id":"a","values":[0.1,0.2]},{"id":"b","values":[0.3]}]',
      }, ctx),
    Error,
    "mixes vector lengths",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-upsert: a record without an id is refused, with its position", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", vectors: '[{"values":[0.1]}]' }, ctx),
    Error,
    "position 0",
  );
});

/** Upsert by id is replace-by-id, so the same call twice is the same state. */
Deno.test("record-upsert: declares itself idempotent, and says it replaces", () => {
  assertEquals(action.idempotent, true);
  assert(/replace, not merge/i.test(action.description!), action.description);
});
