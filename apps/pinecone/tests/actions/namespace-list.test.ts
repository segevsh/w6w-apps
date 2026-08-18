import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/namespace-list.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

Deno.test("namespace-list: reads the index's namespaces", async () => {
  const { ctx, calls } = mockCtx([
    describe,
    { status: 200, body: { namespaces: [{ name: "tenant-1" }] } },
  ]);
  const out = await action.execute!({ indexName: "idx" }, ctx) as { namespaces: unknown[] };
  assertEquals(out.namespaces, [{ name: "tenant-1" }]);
  assertEquals(new URL(calls[1].url).pathname, "/namespaces");
});

Deno.test("namespace-list: pages when asked to return all", async () => {
  const { ctx, calls } = mockCtx([
    describe,
    { status: 200, body: { namespaces: [{ name: "a" }], pagination: { next: "tok" } } },
    { status: 200, body: { namespaces: [{ name: "b" }] } },
  ]);
  const out = await action.execute!({ indexName: "idx", returnAll: true }, ctx) as {
    namespaces: unknown[];
  };
  assertEquals(out.namespaces.length, 2);
  assertEquals(new URL(calls[2].url).searchParams.get("paginationToken"), "tok");
});
