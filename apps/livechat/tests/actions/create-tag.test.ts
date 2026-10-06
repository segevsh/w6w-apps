import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-tag.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-tag: sends name and group_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ name: "docs_feedback", groupIds: "0,42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/create_tag");
  assertEquals(JSON.parse(calls[0].body!), { name: "docs_feedback", group_ids: [0, 42] });
  assertEquals(out, { created: true });
});

Deno.test("create-tag: group ids are optional; name is required", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
  await assertRejects(async () => await action.execute({}, ctx), Error, "`name` is required");
});
