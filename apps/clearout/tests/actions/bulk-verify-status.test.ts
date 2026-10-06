import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-verify-status.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-verify-status: GETs /email_verify/bulk/progress_status with list_id and maps the progress", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", data: { progress_status: "processing", percentile: 42 } },
  }]);
  const out = await run(action, { listId: " l1 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.clearout.io/v2/email_verify/bulk/progress_status?list_id=l1",
  );
  assertEquals(out, { progressStatus: "processing", percent: 42 });
});

Deno.test("bulk-verify-status: a blank list ID throws before any request; a vendor failure throws", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { listId: " " }, none.ctx), Error, "listId is required");
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{
    status: 400,
    body: { status: "failed", error: { code: 1029, message: "List is not available" } },
  }]);
  await assertRejects(() => run(action, { listId: "x" }, bad.ctx), Error, "List is not available");
});
