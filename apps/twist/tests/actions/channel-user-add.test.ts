import { assert, assertEquals } from "@std/assert";
import channelUserAdd from "../../actions/channel-user-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-user-add: POST /api/v3/channels/add_user with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelUserAdd.execute({ "channelId": 100, "userId": 101 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/add_user");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "user_id": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-user-add: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUserAdd.execute({ "channelId": 100, "userId": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-user-add: is declared idempotent", () => {
  assertEquals(channelUserAdd.idempotent, true);
});

Deno.test("channel-user-add: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUserAdd.execute({ "channelId": 100, "userId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-user-add: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelUserAdd.execute({ "channelId": 100, "userId": 101 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
