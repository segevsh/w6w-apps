import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import groupCreate from "../../actions/group-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("group-create: posts the name to /teams/groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: { id: "group_new", name: "Engineering" } } }]);
  await groupCreate.execute({ name: "Engineering" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Engineering" });
});

test("group-create: is not idempotent — retrying creates a second group", () => {
  assertEquals(groupCreate.idempotent, false);
});
