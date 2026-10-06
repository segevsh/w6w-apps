import { assertEquals, assertRejects } from "@std/assert";
import crawl from "../../actions/web-crawl-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("web-crawl-get: GETs /web/crawl/{id}; skip 0 is still sent", async () => {
  const body = {
    status: "scraping",
    pages: [],
    next: "https://api.supadata.ai/v1/web/crawl/c1?skip=100",
  };
  const { ctx, calls } = mockCtx([{ body }, { body }]);
  assertEquals(await crawl.execute({ jobId: "c1" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/web/crawl/c1");
  await crawl.execute({ jobId: "c1", skip: 0 }, ctx);
  assertEquals(calls[1].url, "https://api.supadata.ai/v1/web/crawl/c1?skip=0");
});

Deno.test("web-crawl-get: a 404 is thrown; a blank id makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not-found", message: "m", details: "No crawl" },
  }]);
  await assertRejects(async () => await crawl.execute({ jobId: "x" }, ctx), Error, "No crawl");
  const none = mockCtx();
  await assertRejects(async () => await crawl.execute({ jobId: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
