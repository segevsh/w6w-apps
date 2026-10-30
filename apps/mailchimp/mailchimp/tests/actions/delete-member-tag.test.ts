import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-member-tag.ts";

test("delete-member-tag: POSTs each tag with status inactive", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { listId: "abc", email: "u@example.com", tags: ["one", "two"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.tags, [
    { name: "one", status: "inactive" },
    { name: "two", status: "inactive" },
  ]);
  assertEquals(result, { success: true });
});
