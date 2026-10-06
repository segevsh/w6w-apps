import { assert, assertEquals } from "@std/assert";
import channelList from "../../actions/channel-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("channel-list: GET /api/v3/channels/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await channelList.execute({ "workspaceId": 100, "archived": true }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "workspace_id": "100", "archived": "true" });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("channel-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await channelList.execute({ "workspaceId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "workspace_id": "100" });
});

Deno.test("channel-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await channelList.execute({ "workspaceId": 100, "archived": true }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelList.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
