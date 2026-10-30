import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-archive.ts";

test("submission-archive: DELETEs the submission by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, archived_at: "now" } }]);
  const out = await action.execute!({ id: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: 1, archived_at: "now" });
  assertEquals(action.idempotent, true);
});
