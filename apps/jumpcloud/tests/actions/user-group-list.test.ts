import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-list.ts";

const display = { display: { region: "us" } };

/** Groups are V2 and answer a bare array, where V1 wraps in `results`. */
test("user-group-list: reads the V2 base and handles the bare array", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ id: "g1", name: "Engineering" }] }],
    display,
  );
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups");
  assertEquals(result, [{ id: "g1", name: "Engineering" }]);
});

test("user-group-list: filter and sort reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], display);
  await action.execute!({ filter: "name:$eq:Engineering", sort: "name" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter"), "name:$eq:Engineering");
  assertEquals(q.get("sort"), "name");
});
