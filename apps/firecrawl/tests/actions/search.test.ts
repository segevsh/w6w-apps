import { assertEquals } from "@std/assert";
import search from "../../actions/search.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("search: POSTs the query and unwraps {success, data}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ web: [{ title: "Firecrawl", url: "https://firecrawl.dev" }] }),
  }]);
  const out = await search.execute({ query: "firecrawl" }, ctx) as { web: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/search");
  assertEquals(JSON.parse(calls[0].body!).query, "firecrawl");
  assertEquals(out.web[0], { title: "Firecrawl", url: "https://firecrawl.dev" });
});

Deno.test("search: sources are wrapped into the vendor's {type} objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await search.execute({ query: "x", sources: ["web", "news"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sources, [{ type: "web" }, { type: "news" }]);
});

Deno.test("search: no scrapeOptions sent when no formats requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await search.execute({ query: "x" }, ctx);
  assertEquals("scrapeOptions" in JSON.parse(calls[0].body!), false);
});

Deno.test("search: formats are nested under scrapeOptions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await search.execute({ query: "x", formats: "markdown" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).scrapeOptions, { formats: [{ type: "markdown" }] });
});
