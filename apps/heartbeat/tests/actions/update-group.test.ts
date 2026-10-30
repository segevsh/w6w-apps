import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import updateGroup from "../../actions/update-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("update-group: POST /groups/{id} with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateGroup.execute({ groupID: "g1", isJoinable: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { isJoinable: true });
});

test("update-group: is idempotent — an overwrite reaches the same end state", () => {
  assertEquals(updateGroup.idempotent, true);
});
