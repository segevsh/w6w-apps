import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-tags.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-tags: sends the required group filter", async () => {
  const rows = [{ name: "support", group_ids: [0] }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await action.execute({ groupIds: "0,42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_tags");
  assertEquals(JSON.parse(calls[0].body!), { filters: { group_ids: [0, 42] } });
  assertEquals(out, { items: rows, count: 1 });
});

Deno.test("list-tags: groupIds is required, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`groupIds` is required");
  assertEquals(calls.length, 0);
});
