import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-group-checks-list.ts";

Deno.test("check-group-checks-list: reads a group's members", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "c1" }] }]);
  assertEquals(await action.execute!({ groupId: "1" }, ctx), [{ id: "c1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/check-groups/1/checks");
});

/** Worth having over filtering check-list: the group's settings are applied. */
Deno.test("check-group-checks-list: says the group's settings are already applied", () => {
  assert(action.description!.includes("group's settings applied"), action.description);
});

Deno.test("check-group-checks-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`groupId`");
  assertEquals(calls.length, 0);
});
