import { assertEquals } from "@std/assert";
import crawlStart from "../../actions/crawl-start.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crawl-start: POSTs to /crawl with paths split and scrapeOptions nested", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { success: true, id: "c1", url: "https://x/v2/crawl/c1" },
  }]);
  const out = await crawlStart.execute(
    {
      url: "https://example.com",
      includePaths: "blog/.*, docs/.*",
      excludePaths: "blog/drafts/.*",
      limit: 50,
      formats: ["markdown"],
      onlyMainContent: true,
    },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v2/crawl");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includePaths, ["blog/.*", "docs/.*"]);
  assertEquals(body.excludePaths, ["blog/drafts/.*"]);
  assertEquals(body.limit, 50);
  assertEquals(body.scrapeOptions, { formats: [{ type: "markdown" }], onlyMainContent: true });
  assertEquals(out.id, "c1");
});

Deno.test("crawl-start: an empty scrapeOptions is still sent as {} rather than omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "c1" } }]);
  await crawlStart.execute({ url: "https://example.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.scrapeOptions, {});
});

Deno.test("crawl-start: prefills a limit far below the vendor's 10,000 default", () => {
  const p = crawlStart.params?.find((p) => p.key === "limit");
  assertEquals(p?.default, 100);
});

Deno.test("crawl-start: is declared non-idempotent — every call bills a new crawl", () => {
  assertEquals(crawlStart.idempotent, false);
});
