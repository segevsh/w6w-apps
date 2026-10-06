import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import noteAdd from "../../actions/note-add.ts";

Deno.test("note-add: posts the note, keeping is_private=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "message_uid": "n1" } } }]);
  const out = await noteAdd.execute!(
    { "chatId": 3, "text": "call back", "isPrivate": false } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats/3/notes");
  assertEquals(JSON.parse(calls[0].body!), { "text": "call back", "is_private": false });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("note-add: refuses an empty path id before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await noteAdd.execute!({ "chatId": "" } as never, ctx);
  }, Error);
  assert(err.message.includes("empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("note-add: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await noteAdd.execute!({ "chatId": 3, "text": "call back", "isPrivate": false } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
