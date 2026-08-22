import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-query.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

/** The vector API is camelCase; the records API on the same host is not. */
Deno.test("record-query: sends camelCase topK and include flags", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: { matches: [] } }]);
  await action.execute!({ indexName: "idx", vector: "[0.1,0.2]", topK: 5 }, ctx);
  const sent = JSON.parse(calls[1].body!);
  assertEquals(sent.topK, 5);
  assertEquals(sent.vector, [0.1, 0.2]);
  // Pinecone's own default is false; metadata is what a workflow wants.
  assertEquals(sent.includeMetadata, true);
  assertEquals(sent.includeValues, false);
  assertEquals(new URL(calls[1].url).pathname, "/query");
});

Deno.test("record-query: querying by record id needs no vector", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: { matches: [] } }]);
  await action.execute!({ indexName: "idx", id: "doc-1" }, ctx);
  const sent = JSON.parse(calls[1].body!);
  assertEquals(sent.id, "doc-1");
  assertEquals("vector" in sent, false);
});

Deno.test("record-query: a vector AND an id is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", vector: "[0.1]", id: "x" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-query: neither one is refused too", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx" }, ctx),
    Error,
    "required",
  );
});

Deno.test("record-query: topK beyond Pinecone's ceiling is refused locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", vector: "[0.1]", topK: 10001 }, ctx),
    Error,
    "10000",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-query: the description warns about model mismatch", () => {
  assert(/SAME model/i.test(action.description!), action.description);
  assertEquals(action.type, "search");
});
