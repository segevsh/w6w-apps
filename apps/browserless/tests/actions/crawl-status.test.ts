import { assertEquals, assertRejects } from "@std/assert";
import crawlStatus from "../../actions/crawl-status.ts";
import { mockCtx, region } from "../_helpers.ts";

Deno.test("crawl-status: GETs the crawl with skip and passes the body through", async () => {
  const reply = { status: "completed", total: 2, completed: 2, failed: 0, data: [] };
  const { ctx, calls } = mockCtx([{ body: reply }], { connection: region("lon") });
  const out = await crawlStatus.execute({ id: "crawl_1", skip: 10 }, ctx);
  assertEquals(out, reply);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://production-lon.browserless.io/crawl/crawl_1?skip=10");
});

Deno.test("crawl-status: the id is path-encoded and required", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await crawlStatus.execute({ id: "a/b c" }, ctx);
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/crawl/a%2Fb%20c");
  await assertRejects(
    async () => await crawlStatus.execute({ id: " " }, ctx),
    Error,
    "Crawl id is required",
  );
});

Deno.test("crawl-status: an unknown crawl is a thrown 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Crawl not found" } }]);
  await assertRejects(
    async () => await crawlStatus.execute({ id: "nope" }, ctx),
    Error,
    "Crawl not found",
  );
});
