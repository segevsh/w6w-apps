import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/settings-get.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("settings-get: reads the whole settings object", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { filterableAttributes: ["genres"] } }],
    conn,
  );
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/settings");
  assertEquals(result.filterableAttributes, ["genres"]);
});

/** The two settings that decide whether a search works at all. */
Deno.test("settings-get: the outputs say what filterable and sortable are for", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "filterableAttributes")!.label.includes("a filter needs"));
  assert(outputs.find((o) => o.key === "sortableAttributes")!.label.includes("a sort needs"));
});
