import { assert, assertEquals } from "@std/assert";
import inboxList from "../../actions/inbox-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("inbox-list: GET /api/v3/inbox/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await inboxList.execute({
    "workspaceId": 100,
    "limit": 101,
    "newerThanTs": 102,
    "olderThanTs": 103,
    "archiveFilter": "active",
    "orderBy": "desc",
    "excludeThreadIds": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/inbox/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "workspace_id": "100",
    "limit": "101",
    "newer_than_ts": "102",
    "older_than_ts": "103",
    "archive_filter": "active",
    "order_by": "desc",
    "exclude_thread_ids": "[1,2]",
  });
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }] });
});

Deno.test("inbox-list: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await inboxList.execute({ "workspaceId": 100 }, ctx);

  assertEquals(queryOf(calls[0].url), { "workspace_id": "100" });
});

Deno.test("inbox-list: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }, { "id": 2 }] }]);
  await inboxList.execute({
    "workspaceId": 100,
    "limit": 101,
    "newerThanTs": 102,
    "olderThanTs": 103,
    "archiveFilter": "active",
    "orderBy": "desc",
    "excludeThreadIds": "1, 2",
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("inbox-list: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await inboxList.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
