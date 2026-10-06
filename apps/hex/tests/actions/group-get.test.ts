import { assertEquals } from "@std/assert";
import action from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-get: GET /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "N" } }]);
  const out = await action.execute({ groupId: "x1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v1/groups/x1");
  assertEquals(out.name, "N");
});

Deno.test("group-get: the id cannot escape its path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/groups/a%2Fb");
});
