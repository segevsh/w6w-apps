import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-tags-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("receiver-tags-add: POSTs the tag list", async () => {
  const { ctx, calls } = mockCtx([{ body: ["hero", "batman.Good"] }]);
  const out = await action.execute(
    { receiver: "11", tags: "hero, batman.Good", groupId: "5" },
    ctx,
  ) as { result: unknown };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/receivers/11/tags");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["hero", "batman.Good"], group_id: "5" });
  assertEquals(out.result, ["hero", "batman.Good"]);
});

Deno.test("receiver-tags-add: requires at least one tag", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ receiver: "11", tags: " , " }, ctx),
    Error,
    "`tags` is required",
  );
  assertEquals(calls.length, 0);
});
