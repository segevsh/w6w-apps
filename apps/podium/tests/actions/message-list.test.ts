import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import messageList from "../../actions/message-list.ts";

Deno.test("message-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await messageList.execute(
    {
      "conversation_uid": "conversation_uid-1",
      "cursor": "cursor-1",
      "order": "asc",
      "since": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/conversations/conversation_uid-1/messages");
  assertEquals(url.searchParams.get("cursor"), "cursor-1");
  assertEquals(url.searchParams.get("order"), "asc");
  assertEquals(url.searchParams.get("since"), "2026-10-01T00:00:00Z");
  assertEquals([...url.searchParams.keys()].length, 3);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("message-list: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await messageList.execute(
    { "conversation_uid": "conversation_uid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/conversations/conversation_uid-1/messages");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("message-list: declares its params and kind", () => {
  assertEquals((messageList.params ?? []).map((p) => p.key), [
    "conversation_uid",
    "cursor",
    "order",
    "since",
  ]);
  assertEquals((messageList.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "conversation_uid",
  ]);
  assertEquals(messageList.type, "read");
});
