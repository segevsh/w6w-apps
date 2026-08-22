import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-stats.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

Deno.test("index-stats: posts to the index's own host", async () => {
  const { ctx, calls } = mockCtx([
    describe,
    { status: 200, body: { namespaces: { "": { vectorCount: 3 } }, totalVectorCount: 3 } },
  ]);
  const out = await action.execute!({ indexName: "idx" }, ctx) as { totalVectorCount: number };
  assertEquals(out.totalVectorCount, 3);
  assertEquals(new URL(calls[1].url).host, "idx-abc.svc.aped-1.pinecone.io");
  assertEquals(new URL(calls[1].url).pathname, "/describe_index_stats");
});

/** indexFullness is meaningless on serverless — the output label says so. */
Deno.test("index-stats: labels indexFullness as pod-based only", () => {
  const field = (action.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "indexFullness")!;
  assertEquals(field.label.includes("pod-based"), true);
});
