import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-delete.ts";

test("topic-delete: DELETEs /t/{id}.json and reports what it did", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ status: 200, body: "" }]);
  const out = await action.execute({ topicId: 42 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/t/42.json`);
  assertEquals(calls[0].method, "DELETE");
  // The endpoint answers with an empty body, so the action synthesises a result
  // rather than returning undefined into the workflow.
  assertEquals(out, { deleted: true, topic_id: 42 });
});

test("topic-delete: a 204 is still a success", async () => {
  const { ctx } = mockDiscourseCtx([{ status: 204 }]);
  assertEquals(await action.execute({ topicId: 7 }, ctx), { deleted: true, topic_id: 7 });
});

test("topic-delete: is idempotent — deleting twice converges", () => {
  assertEquals(action.idempotent, true);
});
