import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("user-list: GET /v1/users/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ username: "a@b.test" }] },
  }]);
  const result = await userList.execute({ page: 1 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { page: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ username: "a@b.test" }],
  });
});

test("user-list: declares type read", () => {
  assertEquals(userList.type, "read");
});

test("user-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await userList.execute({ page: 1 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
