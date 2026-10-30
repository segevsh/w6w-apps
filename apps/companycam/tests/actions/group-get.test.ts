import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("group-get: reads one group", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3992883", name: "The Psych Crew" } }]);
  const group = await groupGet.execute({ groupId: "3992883" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/v2/groups/3992883");
  assertEquals(group.name, "The Psych Crew");
});
