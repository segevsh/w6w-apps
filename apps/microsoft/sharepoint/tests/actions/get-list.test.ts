import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list.ts";

test("get-list: GETs {site}/lists/{list-id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L1" } }]);
  await action.execute({ listId: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1");
});

test("get-list: $expand rides as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listId: "L1", expand: ["columns", "items"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "columns,items");
});
