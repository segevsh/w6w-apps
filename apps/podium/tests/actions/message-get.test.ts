import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import messageGet from "../../actions/message-get.ts";

Deno.test("message-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await messageGet.execute(
    { "conversation_uid": "conversation_uid-1", "uid": "uid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/conversations/conversation_uid-1/messages/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("message-get: declares its params and kind", () => {
  assertEquals((messageGet.params ?? []).map((p) => p.key), ["conversation_uid", "uid"]);
  assertEquals((messageGet.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "conversation_uid",
    "uid",
  ]);
  assertEquals(messageGet.type, "read");
});
