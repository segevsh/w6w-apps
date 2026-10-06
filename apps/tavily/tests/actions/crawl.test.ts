import { assertEquals } from "@std/assert";
import crawl from "../../actions/crawl.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crawl: maps camelCase params to the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { base_url: "https://d.com", results: [] } }]);
  await crawl.execute({
    url: " https://d.com ",
    instructions: "find sdk",
    maxDepth: 2,
    maxBreadth: 10,
    limit: 5,
    selectPaths: "/docs/.*",
    excludeDomains: "x.com,y.com",
    allowExternal: false,
    extractDepth: "advanced",
    format: "text",
    includeImages: true,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/crawl");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://d.com",
    instructions: "find sdk",
    max_depth: 2,
    max_breadth: 10,
    limit: 5,
    select_paths: ["/docs/.*"],
    exclude_domains: ["x.com", "y.com"],
    allow_external: false,
    extract_depth: "advanced",
    format: "text",
    include_images: true,
  });
});

Deno.test("crawl: omitted options are left to the vendor defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await crawl.execute({ url: "https://d.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://d.com" });
});
