import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/self-get.ts";

test("self-get: the whoami takes no ids at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1" } } }], { display: {} });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/self");
  assertEquals(action.params, []);
  assertEquals(result, { data: { id: "u1" } });
});
