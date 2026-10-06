import { assert, assertEquals } from "@std/assert";
import channelUsersAdd from "../../actions/channel-users-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-users-add: POST /api/v3/channels/add_users with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelUsersAdd.execute({ "channelId": 100, "userIds": "1, 2" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/add_users");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "user_ids": "[1,2]" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-users-add: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUsersAdd.execute({ "channelId": 100, "userIds": "1, 2" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-users-add: is declared idempotent", () => {
  assertEquals(channelUsersAdd.idempotent, true);
});

Deno.test("channel-users-add: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUsersAdd.execute({ "channelId": 100, "userIds": "1, 2" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-users-add: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelUsersAdd.execute({ "channelId": 100, "userIds": "1, 2" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
