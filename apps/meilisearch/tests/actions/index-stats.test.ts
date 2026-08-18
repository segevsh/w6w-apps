import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-stats.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("index-stats: reads the index's stats", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { numberOfDocuments: 42, isIndexing: true },
  }], conn);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/stats");
  assertEquals(result.isIndexing, true);
});

/** The closest thing to "are my documents searchable yet" without a task id. */
Deno.test("index-stats: the output explains what isIndexing means", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "isIndexing")!.label.includes("enqueued tasks"));
});
