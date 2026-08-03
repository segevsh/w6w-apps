import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-delete.ts";

Deno.test("submission-delete: DELETEs /submission/{id} and returns Jotform's message", async () => {
  const { ctx, calls, logs } = mockCtx([
    { body: envelope("Submission #237955080346633702 deleted successfully.") },
  ]);
  const result = await action.execute({ submissionId: "237955080346633702" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/submission/237955080346633702");
  assertEquals(calls[0].body, null);
  assertEquals(result, { message: "Submission #237955080346633702 deleted successfully." });
  assertEquals(logs[0].level, "info");
});

Deno.test("submission-delete: deleting twice converges, so it is idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
