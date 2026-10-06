import { assertEquals, assertRejects } from "@std/assert";
import search from "../../actions/search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search: query only", async () => {
  const { ctx, calls } = mockCtx([{ body: { web: [] } }]);
  const out = await search.execute({ query: " w6w " }, ctx);
  assertEquals(out, { data: { web: [] } });
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/search");
  assertEquals(JSON.parse(calls[0].body!), { query: "w6w" });
});

Deno.test("search: filters and scrapeOptions", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await search.execute(
    {
      query: "q",
      limit: 3,
      country: "GB",
      tbs: "week",
      sources: ["web", "news"],
      scrapeFormats: ["markdown"],
      onlyMainContent: true,
      proxy: "datacenter",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    query: "q",
    limit: 3,
    country: "gb",
    tbs: "week",
    sources: ["web", "news"],
    proxy: "datacenter",
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
});

Deno.test("search: needs a query", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await search.execute({ query: "  " }, ctx),
    Error,
    "Query is required",
  );
});
