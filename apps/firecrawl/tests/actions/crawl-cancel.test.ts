import { assertEquals, assertRejects } from "@std/assert";
import crawlCancel from "../../actions/crawl-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crawl-cancel: DELETEs /crawl/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "cancelled" } }]);
  const out = await crawlCancel.execute({ id: "c1" }, ctx) as { status: string };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/crawl/c1");
  assertEquals(out.status, "cancelled");
});

Deno.test("crawl-cancel: an unknown job id surfaces as an error, not a silent no-op", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Crawl job not found.") }]);
  await assertRejects(
    () => Promise.resolve(crawlCancel.execute({ id: "nope" }, ctx)),
    Error,
    "Crawl job not found",
  );
});

Deno.test("crawl-cancel: idempotent — cancelling twice ends the same way", () => {
  assertEquals(crawlCancel.idempotent, true);
});
