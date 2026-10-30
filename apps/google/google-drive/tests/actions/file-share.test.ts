import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-share.ts";

test("file-share: POSTs permission body to /files/{id}/permissions", async () => {
  const body = { id: "perm-1", role: "reader" };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!(
    {
      fileId: "file-1",
      type: "user",
      role: "reader",
      emailAddress: "alice@example.com",
      sendNotificationEmail: false,
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/drive/v3/files/file-1/permissions");
  assertEquals(url.searchParams.get("sendNotificationEmail"), "false");
  assertEquals(url.searchParams.get("supportsAllDrives"), "true");

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.type, "user");
  assertEquals(sent.role, "reader");
  assertEquals(sent.emailAddress, "alice@example.com");
});
