import { assertEquals } from "@std/assert";
import batchScrapeStatusGet from "../../actions/batch-scrape-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-scrape-status-get: GETs /batch/scrape/{id} and returns the body verbatim", async () => {
  const statusBody = { status: "completed", total: 2, completed: 2, data: [{ markdown: "a" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: statusBody }]);
  const out = await batchScrapeStatusGet.execute({ id: "b1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/batch/scrape/b1");
  assertEquals(out, statusBody);
});

Deno.test("batch-scrape-status-get: is a read", () => {
  assertEquals(batchScrapeStatusGet.type, "read");
});
