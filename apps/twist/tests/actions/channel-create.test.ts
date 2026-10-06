import { assert, assertEquals } from "@std/assert";
import channelCreate from "../../actions/channel-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-create: POST /api/v3/channels/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelCreate.execute({
    "workspaceId": 100,
    "name": "sample name",
    "tempId": 102,
    "userIds": "1, 2",
    "color": 104,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 110,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "workspace_id": "100",
    "name": "sample name",
    "temp_id": "102",
    "user_ids": "[1,2]",
    "color": "104",
    "public": "true",
    "description": "sample description",
    "default_groups": "[1,2]",
    "default_recipients": "[1,2]",
    "is_favorited": "true",
    "icon": "110",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelCreate.execute({
    "workspaceId": 100,
    "name": "sample name",
    "tempId": 102,
    "userIds": "1, 2",
    "color": 104,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 110,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelCreate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);

  assertEquals(formOf(calls[0].body), { "workspace_id": "100", "name": "sample name" });
});

Deno.test("channel-create: is declared non-idempotent", () => {
  assertEquals(channelCreate.idempotent, false);
});

Deno.test("channel-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelCreate.execute({
    "workspaceId": 100,
    "name": "sample name",
    "tempId": 102,
    "userIds": "1, 2",
    "color": 104,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 110,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelCreate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
