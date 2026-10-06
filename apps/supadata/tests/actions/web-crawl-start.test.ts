import { assertEquals, assertRejects } from "@std/assert";
import crawl from "../../actions/web-crawl-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("web-crawl-start: POSTs url and limit to /web/crawl and returns the job id", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "c1" } }]);
  assertEquals(await crawl.execute({ url: "https://e.test", limit: 50 }, ctx), { jobId: "c1" });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/web/crawl");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://e.test", limit: 50 });
});

Deno.test("web-crawl-start: limit is omitted when unset; a blank url makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "c2" } }]);
  await crawl.execute({ url: "https://e.test" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://e.test" });
  const none = mockCtx();
  await assertRejects(async () => await crawl.execute({ url: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
