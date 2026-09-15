import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("user-get: GETs /current/user", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { id: 1, name: "admin", admin: true } }],
    conn,
  );
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/current/user");
  assertEquals(result, { id: 1, name: "admin", admin: true });
});
