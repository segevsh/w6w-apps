import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-fetch.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

test("record-fetch: ids go in the query string, repeated", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: { vectors: {} } }]);
  await action.execute!({ indexName: "idx", ids: "a, b", namespace: "ns" }, ctx);
  const url = new URL(calls[1].url);
  assertEquals(url.pathname, "/vectors/fetch");
  assertEquals(url.searchParams.getAll("ids"), ["a", "b"]);
  assertEquals(url.searchParams.get("namespace"), "ns");
});

test("record-fetch: no ids is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ indexName: "idx" }, ctx), Error, "ids");
  assertEquals(calls.length, 0);
});
