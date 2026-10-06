import { assertEquals, assertRejects } from "@std/assert";
import crawlCancel from "../../actions/crawl-cancel.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("crawl-cancel: DELETE of a running crawl", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "crawl_1", status: "cancelled" } }]);
  const out = await crawlCancel.execute({ id: "crawl_1" }, ctx);
  assertEquals(out, {
    id: "crawl_1",
    status: "cancelled",
    alreadyFinished: false,
    message: undefined,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/crawl/crawl_1");
});

Deno.test("crawl-cancel: a 409 is the crawl's state, not an error", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { id: "crawl_1", status: "completed", message: "Crawl is already completed" },
  }]);
  const out = await crawlCancel.execute({ id: "crawl_1" }, ctx);
  assertEquals(out, {
    id: "crawl_1",
    status: "completed",
    alreadyFinished: true,
    message: "Crawl is already completed",
  });
});

Deno.test("crawl-cancel: other failures throw; an id is required", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "nope" } }]);
  await assertRejects(async () => await crawlCancel.execute({ id: "x" }, ctx), Error, "404");
  await assertRejects(
    async () => await crawlCancel.execute({ id: "" }, ctx),
    Error,
    "Crawl id is required",
  );
});
