import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-format.ts";

test("get-format: GETs /formats/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ formatId: "2" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/formats/2/");
});
