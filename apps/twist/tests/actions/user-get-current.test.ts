import { assert, assertEquals } from "@std/assert";
import userGetCurrent from "../../actions/user-get-current.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-get-current: GET /api/v3/users/get_session_user with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  const out = await userGetCurrent.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/users/get_session_user");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { "id": 7, "name": "Ada", "email": "ada@example.com" });
});

Deno.test("user-get-current: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  await userGetCurrent.execute({}, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("user-get-current: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await userGetCurrent.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});

Deno.test("user-get-current: never returns the user's API token", async () => {
  const { ctx } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  const out = await userGetCurrent.execute({}, ctx) as Record<string, unknown>;

  assertEquals("token" in out, false);
  assertEquals(JSON.stringify(out).includes("SECRET-TOKEN"), false);
});
