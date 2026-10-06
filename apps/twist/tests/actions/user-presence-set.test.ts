import { assert, assertEquals } from "@std/assert";
import userPresenceSet from "../../actions/user-presence-set.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-presence-set: POST /api/v3/users/heartbeat with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await userPresenceSet.execute(
    { "workspaceId": 100, "platform": "api" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/users/heartbeat");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "workspace_id": "100", "platform": "api" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("user-presence-set: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await userPresenceSet.execute({ "workspaceId": 100, "platform": "api" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("user-presence-set: is declared idempotent", () => {
  assertEquals(userPresenceSet.idempotent, true);
});

Deno.test("user-presence-set: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await userPresenceSet.execute({ "workspaceId": 100, "platform": "api" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("user-presence-set: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await userPresenceSet.execute({ "workspaceId": 100, "platform": "api" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
