import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mailing-list-list.ts";

/** The one collection Loops answers as a bare array with no cursor at all. */
test("mailing-list-list: makes one unpaged call and returns the array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "l1", name: "Product updates" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "l1", name: "Product updates" }]);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/lists");
  assertEquals(new URL(calls[0].url).searchParams.get("perPage"), null);
});

test("mailing-list-list: takes no parameters", () => {
  assertEquals(action.params, []);
});
