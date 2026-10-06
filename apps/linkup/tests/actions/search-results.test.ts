import { assertEquals } from "@std/assert";
import searchResults from "../../actions/search-results.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-results: pins searchResults, defaults depth, hides output-type params", async () => {
  const r = mockCtx([{ body: { results: [] } }]);
  assertEquals((await searchResults.execute({ q: "q" }, r.ctx)).results, []);
  assertEquals(JSON.parse(r.calls[0].body!), {
    q: "q",
    depth: "standard",
    outputType: "searchResults",
  });
  const keys = searchResults.params!.map((p) => p.key);
  assertEquals(keys.includes("outputType"), false);
  assertEquals(keys.includes("structuredOutputSchema"), false);
  assertEquals(keys.includes("includeInlineCitations"), false);
});
