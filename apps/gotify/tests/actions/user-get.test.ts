import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("user-get: GETs /current/user", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { id: 1, name: "admin", admin: true } }],
    conn,
  );
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/current/user");
  assertEquals(result, { id: 1, name: "admin", admin: true });
});
