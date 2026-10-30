import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/command-list.ts";

const display = { display: { region: "us" } };

test("command-list: reads the V1 commands collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ _id: "c1" }] } }], display);
  assertEquals(await action.execute!({}, ctx), [{ _id: "c1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/commands");
});

test("command-list: sort is converted to JumpCloud's spaces", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], display);
  await action.execute!({ sort: "name, -created" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sort"), "name -created");
});
