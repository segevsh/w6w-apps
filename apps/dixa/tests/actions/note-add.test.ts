import { assert, assertEquals } from "@std/assert";
import noteAdd from "../../actions/note-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("note-add: calls POST /v1/conversations/4711/notes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "11111111-2222-3333-4444-555555555555", "csid": 4711 } },
  }]);
  const out = await noteAdd.execute(
    {
      "conversationId": 4711,
      "message": " remember ",
      "agentId": "11111111-2222-3333-4444-555555555555",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/notes");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "message": "remember",
    "agentId": "11111111-2222-3333-4444-555555555555",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { "data": { "id": "11111111-2222-3333-4444-555555555555", "csid": 4711 } });
});

Deno.test("note-add: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await noteAdd.execute(
      {
        "conversationId": 4711,
        "message": " remember ",
        "agentId": "11111111-2222-3333-4444-555555555555",
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("note-add: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await noteAdd.execute({ "conversationId": 1, "message": " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("message is required"), message);
  assertEquals(calls.length, 0);
});
