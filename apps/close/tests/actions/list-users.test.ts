import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

test("list-users: GETs /user/ with paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ limit: 10 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/user/");
  assertEquals(new URL(calls[0].url).searchParams.get("_limit"), "10");
});

test("list-users: passes the ordering through as _order_by", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], has_more: false } }]);
  await action.execute({ orderBy: "first_name,last_name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("_order_by"), "first_name,last_name");
});

test("list-users: constrains ordering to the two documented values", () => {
  assertEquals(param(action, "orderBy").type, "select");
  assertEquals(optionValues(action, "orderBy"), [
    "last_name,first_name",
    "first_name,last_name",
  ]);
});
