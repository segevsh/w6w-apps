import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-upsert-text.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

/** This is the one route in Pinecone's API that takes NDJSON. */
Deno.test("record-upsert-text: sends NDJSON, one record per line", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({
    indexName: "idx",
    namespace: "docs",
    records: '[{"_id":"1","chunk_text":"a"},{"_id":"2","chunk_text":"b"}]',
  }, ctx);
  assertEquals(calls[1].headers["content-type"], "application/x-ndjson");
  assertEquals(calls[1].body, '{"_id":"1","chunk_text":"a"}\n{"_id":"2","chunk_text":"b"}');
  assertEquals(new URL(calls[1].url).pathname, "/records/namespaces/docs/upsert");
});

/** 96, not 1000 — Pinecone embeds these server-side. */
Deno.test("record-upsert-text: the batch limit is 96, not the vector limit", async () => {
  const { ctx, calls } = mockCtx();
  const many = Array.from({ length: 97 }, (_, i) => ({ _id: `r${i}`, chunk_text: "x" }));
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", records: JSON.stringify(many) }, ctx),
    Error,
    "96",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-upsert-text: a record without _id is refused and the message names the field", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", records: '[{"chunk_text":"a"}]' }, ctx),
    Error,
    "_id",
  );
});

Deno.test("record-upsert-text: the default namespace still occupies its path segment", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({ indexName: "idx", records: '[{"_id":"1"}]' }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/records/namespaces//upsert");
});

Deno.test("record-upsert-text: the records hint points at the index's field map", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "records")!;
  assert(/field_map|field map/i.test(p.hint!), p.hint);
});
