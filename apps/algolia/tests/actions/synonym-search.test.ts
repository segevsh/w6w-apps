import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/synonym-search.ts";

/** Searching is how you list — there is no GET collection for synonyms. */
Deno.test("synonym-search: an empty query lists every synonym", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [], nbHits: 0 } }], {
    display: { appId: "APPID" },
  });
  await action.execute!({ indexName: "products" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/synonyms/search");
  // Param defaults are applied by the host; a bare execute() sends only what
  // it was given, and Algolia then uses its own page size.
  assertEquals(JSON.parse(calls[0].body!), {});
});
