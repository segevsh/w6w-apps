import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-list.ts";

test("index-list: lists the project's indexes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { indexes: [{ name: "idx" }] } }]);
  assertEquals(await action.execute!({}, ctx), { indexes: [{ name: "idx" }] });
  assertEquals(new URL(calls[0].url).pathname, "/indexes");
});
