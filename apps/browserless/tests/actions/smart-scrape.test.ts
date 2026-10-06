import { assertEquals, assertRejects } from "@std/assert";
import smartScrape from "../../actions/smart-scrape.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("smart-scrape: maps formats, selectors and headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { markdown: "# hi" } }]);
  const out = await smartScrape.execute(
    {
      url: "https://a.com",
      formats: ["markdown", "links"],
      onlyMainContent: true,
      excludeTags: "nav\n footer \n",
      headers: '{"x-a":"1"}',
      waitFor: 100,
      proxy: "datacenter",
    },
    ctx,
  );
  assertEquals(out, { data: { markdown: "# hi" } });
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/smart-scrape?proxy=datacenter");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    formats: ["markdown", "links"],
    onlyMainContent: true,
    excludeTags: ["nav", "footer"],
    headers: { "x-a": "1" },
    waitFor: 100,
    proxy: "datacenter",
  });
});

Deno.test("smart-scrape: strategyCache false is sent; overrides win", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await smartScrape.execute(
    { url: "https://a.com", strategyCache: false, requestOverrides: { waitFor: 5 }, waitFor: 1 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.strategyCache, false);
  assertEquals(body.waitFor, 5);
});

Deno.test("smart-scrape: needs a URL and an object for headers", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await smartScrape.execute({ url: "" }, ctx),
    Error,
    "URL is required",
  );
  await assertRejects(
    async () => await smartScrape.execute({ url: "https://a.com", headers: "[]" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});
