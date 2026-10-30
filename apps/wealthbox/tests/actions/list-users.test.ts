import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

test("list-users: is a read action", () => {
  assertEquals(action.type, "read");
});

test("list-users: GETs /users with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [] } }]);
  await action.execute({ status: "all" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/users");
  assertEquals(url.searchParams.get("status"), "all");
});

test("list-users: defaults status to active in its param declaration", () => {
  const p = (action.params ?? []).find((p) => p.key === "status")!;
  assertEquals(p.default, "active");
});
