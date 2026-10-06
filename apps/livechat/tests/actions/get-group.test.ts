import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-group: id is an integer and 0 is accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 0, name: "General" } }]);
  const out = await action.execute({ groupId: 0, fields: ["agent_priorities"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/get_group");
  assertEquals(JSON.parse(calls[0].body!), { id: 0, fields: ["agent_priorities"] });
  assertEquals(out, { group: { id: 0, name: "General" } });
});

Deno.test("get-group: groupId is required and must be a non-negative integer", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`groupId` is required");
  await assertRejects(async () => await action.execute({ groupId: -1 }, ctx), Error, "integer");
  await assertRejects(async () => await action.execute({ groupId: "abc" }, ctx), Error, "integer");
  assertEquals(calls.length, 0);
});
