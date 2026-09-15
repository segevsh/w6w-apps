import { assertEquals } from "@std/assert";
import crawlStatusGet from "../../actions/crawl-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crawl-status-get: GETs /crawl/{id} and returns the body verbatim (no success envelope)", async () => {
  const statusBody = {
    status: "completed",
    total: 3,
    completed: 3,
    creditsUsed: 3,
    data: [{ markdown: "a" }],
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: statusBody }]);
  const out = await crawlStatusGet.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/crawl/c1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, statusBody);
});

Deno.test("crawl-status-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "scraping" } }]);
  await crawlStatusGet.execute({ id: "has space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/crawl/has%20space");
});

Deno.test("crawl-status-get: is a read", () => {
  assertEquals(crawlStatusGet.type, "read");
});
