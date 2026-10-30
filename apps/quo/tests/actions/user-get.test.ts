import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: GETs /v1/users/{userId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "US1" } } }]);
  await userGet.execute({ userId: "US1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/users/US1");
});

test("user-get: is a read action", () => {
  assertEquals(userGet.type, "read");
});
