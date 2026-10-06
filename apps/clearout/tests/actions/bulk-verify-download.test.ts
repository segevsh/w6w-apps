import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-verify-download.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-verify-download: POSTs list_id to /download/result and returns the URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", data: { url: "https://files/x.csv" } },
  }]);
  const out = await run(action, { listId: "l1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/download/result");
  assertEquals(JSON.parse(calls[0].body!), { list_id: "l1" });
  assertEquals(out.url, "https://files/x.csv");
});

Deno.test("bulk-verify-download: blank list ID and 402 throw", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "listId is required");
  const poor = mockCtx([{
    status: 402,
    body: { status: "failed", error: { code: 1002, message: "exhausted" } },
  }]);
  await assertRejects(() => run(action, { listId: "l" }, poor.ctx), Error, "credits");
});
