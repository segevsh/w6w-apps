import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-find-cancel.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-find-cancel: POSTs list_id to /email_finder/list/cancel and maps the list", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: { name: "n.csv", source: "upload", created_on: "2026-10-01" },
    },
  }]);
  const out = await run(action, { listId: "l1" }, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_finder/list/cancel");
  assertEquals(JSON.parse(calls[0].body!), { list_id: "l1" });
  assertEquals(out, { name: "n.csv", source: "upload", createdOn: "2026-10-01" });
});

Deno.test("bulk-find-cancel: blank list ID throws without a request", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { listId: "" }, none.ctx), Error, "listId is required");
  assertEquals(none.calls.length, 0);
});
