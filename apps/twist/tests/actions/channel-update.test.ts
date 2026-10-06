import { assert, assertEquals } from "@std/assert";
import channelUpdate from "../../actions/channel-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-update: POST /api/v3/channels/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelUpdate.execute({
    "channelId": 100,
    "name": "sample name",
    "color": 102,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 108,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "id": "100",
    "name": "sample name",
    "color": "102",
    "public": "true",
    "description": "sample description",
    "default_groups": "[1,2]",
    "default_recipients": "[1,2]",
    "is_favorited": "true",
    "icon": "108",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUpdate.execute({
    "channelId": 100,
    "name": "sample name",
    "color": 102,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 108,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-update: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUpdate.execute({ "channelId": 100, "name": "sample name" }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100", "name": "sample name" });
});

Deno.test("channel-update: is declared idempotent", () => {
  assertEquals(channelUpdate.idempotent, true);
});

Deno.test("channel-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUpdate.execute({
    "channelId": 100,
    "name": "sample name",
    "color": 102,
    "public": true,
    "description": "sample description",
    "defaultGroups": "1, 2",
    "defaultRecipients": "1, 2",
    "isFavorited": true,
    "icon": 108,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelUpdate.execute({ "channelId": 100, "name": "sample name" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
