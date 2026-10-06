import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-verify-remove.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-verify-remove: POSTs list_id to /email_verify/list/remove; ignore_result only when asked", async () => {
  const resp = {
    body: { status: "success", data: { name: "n.csv", source: "upload", created_on: "d" } },
  };
  const plain = mockCtx([resp]);
  const out = await run(action, { listId: "l1" }, plain.ctx);
  assertEquals(plain.calls[0].url, "https://api.clearout.io/v2/email_verify/list/remove");
  assertEquals(JSON.parse(plain.calls[0].body!), { list_id: "l1" });
  assertEquals(out.name, "n.csv");
  const forced = mockCtx([resp]);
  await run(action, { listId: "l1", ignoreResult: true }, forced.ctx);
  assertEquals(JSON.parse(forced.calls[0].body!), { list_id: "l1", ignore_result: true });
});

Deno.test("bulk-verify-remove: blank list ID and a vendor refusal throw", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "listId is required");
  const denied = mockCtx([{
    status: 400,
    body: { status: "failed", error: { message: "download in progress" } },
  }]);
  await assertRejects(
    () => run(action, { listId: "l" }, denied.ctx),
    Error,
    "download in progress",
  );
});
