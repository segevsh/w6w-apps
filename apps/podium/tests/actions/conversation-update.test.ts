import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import conversationUpdate from "../../actions/conversation-update.ts";

Deno.test("conversation-update: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await conversationUpdate.execute(
    {
      "uid": "uid-1",
      "assignedUserUid": "assignedUserUid-1",
      "assignedByName": "assignedByName-1",
      "closed": true,
      "conversationAssigneeUids": "a1, b2",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PUT");
  assertEquals(url.origin + url.pathname, API + "/conversations/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "assignedUserUid": "assignedUserUid-1",
    "assignedByName": "assignedByName-1",
    "closed": true,
    "conversationAssigneeUids": ["a1", "b2"],
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("conversation-update: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await conversationUpdate.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PUT");
  assertEquals(url.origin + url.pathname, API + "/conversations/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, "{}");
  assertEquals(result, { uid: "r1" });
});

Deno.test("conversation-update: declares its params and kind", () => {
  assertEquals((conversationUpdate.params ?? []).map((p) => p.key), [
    "uid",
    "assignedUserUid",
    "assignedByName",
    "closed",
    "conversationAssigneeUids",
  ]);
  assertEquals((conversationUpdate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "uid",
  ]);
  assertEquals(conversationUpdate.type, "perform");
  assertEquals(conversationUpdate.idempotent, true);
});
