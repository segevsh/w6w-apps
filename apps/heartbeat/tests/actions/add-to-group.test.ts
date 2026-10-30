import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import addToGroup from "../../actions/add-to-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("add-to-group: PUT /groups/{id}/memberships with split emails", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await addToGroup.execute({ groupID: "g1", emails: "a@b.com, c@d.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1/memberships");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@b.com", "c@d.com"] });
});

test("add-to-group: is idempotent — a set union", () => {
  assertEquals(addToGroup.idempotent, true);
});
