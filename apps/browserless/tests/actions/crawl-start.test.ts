import { assertEquals, assertRejects } from "@std/assert";
import crawlStart from "../../actions/crawl-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("crawl-start: builds the nested body and returns the crawl id", async () => {
  const reply = { success: true, id: "crawl_1", url: "https://x/crawl/crawl_1" };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await crawlStart.execute(
    {
      url: "https://a.com",
      limit: 5,
      maxDepth: 0,
      allowSubdomains: false,
      sitemap: "skip",
      excludePaths: "/admin\n/tmp",
      formats: ["markdown"],
      proxy: "datacenter",
      webhookUrl: "https://hooks.example.com/b",
      webhookEvents: ["completed"],
    },
    ctx,
  );
  assertEquals(out, reply);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/crawl");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    limit: 5,
    maxDepth: 0,
    allowSubdomains: false,
    sitemap: "skip",
    excludePaths: ["/admin", "/tmp"],
    scrapeOptions: { formats: ["markdown"], proxy: "datacenter" },
    webhook: { url: "https://hooks.example.com/b", events: ["completed"] },
  });
});

Deno.test("crawl-start: minimal body, and refusals", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, id: "c" } }]);
  await crawlStart.execute({ url: "https://a.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://a.com" });
  await assertRejects(
    async () => await crawlStart.execute({ url: "" }, ctx),
    Error,
    "URL is required",
  );
  await assertRejects(
    async () => await crawlStart.execute({ url: "https://a.com", webhookUrl: "http://x" }, ctx),
    Error,
    "https",
  );
  assertEquals(calls.length, 1);
});
