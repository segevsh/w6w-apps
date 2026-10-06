import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/crawl-delete.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("crawl-delete: sends delete=1 with the job name", async () => {
  const { ctx, calls } = mockCtx([{ body: { response: "Successfully deleted job." } }]);
  const out = await run(action, { name: " test-crawl " }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/v3/crawl");
  assertEquals(q.get("name"), "test-crawl");
  assertEquals(q.get("delete"), "1");
  assertEquals(out.deleted, true);
  assertEquals(out.message, "Successfully deleted job.");
});

Deno.test("crawl-delete: a vendor error is thrown, not reported as deleted", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { errorCode: 400, error: "No collection record" },
  }]);
  await assertRejects(() => run(action, { name: "nope" }, ctx), Error, "No collection record");
});
