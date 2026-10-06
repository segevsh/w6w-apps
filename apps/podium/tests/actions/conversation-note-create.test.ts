import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import conversationNoteCreate from "../../actions/conversation-note-create.ts";

Deno.test("conversation-note-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await conversationNoteCreate.execute(
    { "uid": "uid-1", "body": "body text", "senderName": "senderName-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/conversations/uid-1/notes");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "body": "body text",
    "senderName": "senderName-1",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("conversation-note-create: declares its params and kind", () => {
  assertEquals((conversationNoteCreate.params ?? []).map((p) => p.key), [
    "uid",
    "body",
    "senderName",
  ]);
  assertEquals((conversationNoteCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "uid",
    "body",
    "senderName",
  ]);
  assertEquals(conversationNoteCreate.type, "perform");
  assertEquals(conversationNoteCreate.idempotent, false);
});
