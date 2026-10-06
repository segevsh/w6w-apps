import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-scheduled-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("delete-scheduled-email: DELETEs by reference id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "The scheduled email has been deleted.", data: null },
  }]);
  const out = await run(action, { referenceId: "abc1234567890abcdef1234" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://smtp.maileroo.com/api/v2/emails/scheduled/abc1234567890abcdef1234",
  );
  assertEquals(out, { deleted: true, message: "The scheduled email has been deleted." });
});

Deno.test("delete-scheduled-email: requires an id; a 404 throws", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, body: { success: false, message: "not found" } }]);
  await assertRejects(
    () => run(action, { referenceId: " " }, ctx),
    Error,
    "referenceId is required",
  );
  assertEquals(calls.length, 0);
  await assertRejects(() => run(action, { referenceId: "x" }, ctx), Error, "not found");
});
