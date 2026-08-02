import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-note.ts";

Deno.test("add-note: POSTs /conversations/{id}/notes and reads the id off Resource-ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "resource-id": "567" } }]);
  const out = await action.execute({ conversationId: 123, text: "Buy more pens" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conversations/123/notes");
  assertEquals(JSON.parse(calls[0].body!), { text: "Buy more pens" });
  assertEquals(out, { id: 567 });
});

Deno.test("add-note: userId/status are forwarded when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: {} }]);
  await action.execute({ conversationId: 1, text: "note", userId: 9, status: "pending" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { text: "note", user: 9, status: "pending" });
});
