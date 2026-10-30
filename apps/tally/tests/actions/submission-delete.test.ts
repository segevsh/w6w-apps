import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-delete.ts";

test("submission-delete: DELETEs the submission and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ formId: "f1", submissionId: "s1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/submissions/s1");
  assertEquals(result, { submissionId: "s1", deleted: true });
});

test("submission-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
