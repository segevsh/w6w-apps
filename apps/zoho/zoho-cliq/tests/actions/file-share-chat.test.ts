import { assert, assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/file-share-chat.ts";

Deno.test("file-share-chat: uploads multipart to a chat", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 204 }]);
  const out = await action.execute(
    {
      "chatId": "CT_1",
      "file": "aGVsbG8=",
      "fileName": "a.txt",
      "fileMimeType": "text/plain",
      "comment": "cap",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/files");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assert(calls[0].body === "[object FormData]", "expected a multipart FormData body");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "success": true });
});

Deno.test("file-share-chat: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
