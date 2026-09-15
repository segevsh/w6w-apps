import { assertEquals } from "@std/assert";
import batchScrapeStart from "../../actions/batch-scrape-start.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-scrape-start: splits URLs on newlines and commas", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "b1" } }]);
  await batchScrapeStart.execute(
    { urls: "https://a.example\nhttps://b.example, https://c.example" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/batch/scrape");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.urls, ["https://a.example", "https://b.example", "https://c.example"]);
});

Deno.test("batch-scrape-start: scrape options are spread at the top level, not nested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, id: "b1" } }]);
  await batchScrapeStart.execute({ urls: "https://a.example", formats: ["markdown"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.formats, [{ type: "markdown" }]);
  assertEquals("scrapeOptions" in body, false);
});

Deno.test("batch-scrape-start: is declared non-idempotent", () => {
  assertEquals(batchScrapeStart.idempotent, false);
});
