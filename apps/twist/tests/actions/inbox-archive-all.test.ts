import { assert, assertEquals } from "@std/assert";
import inboxArchiveAll from "../../actions/inbox-archive-all.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-archive-all: POST /api/v3/inbox/archive_all with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await inboxArchiveAll.execute(
    { "workspaceId": 100, "olderThanTs": 101 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/inbox/archive_all");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "workspace_id": "100", "older_than_ts": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("inbox-archive-all: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await inboxArchiveAll.execute({ "workspaceId": 100, "olderThanTs": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("inbox-archive-all: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await inboxArchiveAll.execute({ "workspaceId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "workspace_id": "100" });
});

Deno.test("inbox-archive-all: is declared idempotent", () => {
  assertEquals(inboxArchiveAll.idempotent, true);
});

Deno.test("inbox-archive-all: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await inboxArchiveAll.execute({ "workspaceId": 100, "olderThanTs": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("inbox-archive-all: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await inboxArchiveAll.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
