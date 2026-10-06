import { assert, assertEquals } from "@std/assert";
import workspaceUserAdd from "../../actions/workspace-user-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-user-add: POST /api/v4/workspace_users/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserAdd.execute({
    "workspaceId": 100,
    "email": "sample email",
    "name": "sample name",
    "userType": "USER",
    "channelIds": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "id": "100",
    "email": "sample email",
    "name": "sample name",
    "user_type": "USER",
    "channel_ids": "[1,2]",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-add: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserAdd.execute({
    "workspaceId": 100,
    "email": "sample email",
    "name": "sample name",
    "userType": "USER",
    "channelIds": "1, 2",
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-user-add: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserAdd.execute({ "workspaceId": 100, "email": "sample email" }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100", "email": "sample email" });
});

Deno.test("workspace-user-add: is declared non-idempotent", () => {
  assertEquals(workspaceUserAdd.idempotent, false);
});

Deno.test("workspace-user-add: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserAdd.execute({
    "workspaceId": 100,
    "email": "sample email",
    "name": "sample name",
    "userType": "USER",
    "channelIds": "1, 2",
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-add: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserAdd.execute({ "workspaceId": 100, "email": "sample email" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
