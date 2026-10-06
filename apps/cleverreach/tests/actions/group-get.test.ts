import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import action from "../../actions/group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-get: calls GET /v3/groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "News" } }]);
  const out = await action.execute({ groupId: "42" }, ctx) as { item: { name: string } };
  assertEquals(pathOf(calls[0].url), "/v3/groups/42");
  assertEquals(out.item.name, "News");
});

Deno.test("group-get: requires a group id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: " " }, ctx),
    Error,
    "`groupId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("group-get: surfaces a 404 with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: 404, message: "Not Found: group" } },
  }]);
  const err = await assertRejects(async () => await action.execute({ groupId: "9" }, ctx));
  assertMatch((err as Error).message, /CleverReach 404: Not Found: group/);
});
