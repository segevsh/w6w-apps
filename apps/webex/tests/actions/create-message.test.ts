import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-message.ts";

Deno.test("create-message: POSTs /messages with text to a room", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute({ roomId: "r1", text: "hi" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages");
  assertEquals(JSON.parse(calls[0].body!), { roomId: "r1", text: "hi" });
});

Deno.test("create-message: wraps a single file URL into the files array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ roomId: "r1", fileUrl: "https://example.com/a.png" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.files, ["https://example.com/a.png"]);
});

Deno.test("create-message: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
