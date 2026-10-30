import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sessionAttachmentList from "../../actions/session-attachment-list.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("session-attachment-list: lists a session's attachments as a bare array", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { attachment_id: "att-1", name: "log.txt", source: "devin", url: "https://api.devin.ai/x" },
    ],
  }]);
  const out = await sessionAttachmentList.execute({ devinId: "devin-1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1/attachments`);
  assertEquals(out.length, 1);
  assertEquals(out[0].name, "log.txt");
});

test("session-attachment-list: is a read action — the endpoint takes no cursor/limit", () => {
  assertEquals(sessionAttachmentList.type, "read");
  assertEquals(sessionAttachmentList.params?.length, 1);
});
