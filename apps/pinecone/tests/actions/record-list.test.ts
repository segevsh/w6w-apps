import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-list.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

Deno.test("record-list: lists ids under a prefix", async () => {
  const { ctx, calls } = mockCtx([
    describe,
    { status: 200, body: { vectors: [{ id: "doc123#c1" }], namespace: "ns" } },
  ]);
  const out = await action.execute!(
    { indexName: "idx", namespace: "ns", prefix: "doc123#" },
    ctx,
  ) as { vectors: unknown[] };
  assertEquals(out.vectors.length, 1);
  const url = new URL(calls[1].url);
  assertEquals(url.pathname, "/vectors/list");
  assertEquals(url.searchParams.get("prefix"), "doc123#");
});

Deno.test("record-list: follows the pagination token when returning all", async () => {
  const { ctx, calls } = mockCtx([
    describe,
    { status: 200, body: { vectors: [{ id: "a" }], pagination: { next: "tok" } } },
    { status: 200, body: { vectors: [{ id: "b" }] } },
  ]);
  const out = await action.execute!({ indexName: "idx", returnAll: true }, ctx) as {
    vectors: unknown[];
  };
  assertEquals(out.vectors, [{ id: "a" }, { id: "b" }]);
  assertEquals(new URL(calls[2].url).searchParams.get("paginationToken"), "tok");
});
