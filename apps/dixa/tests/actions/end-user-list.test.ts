import { assert, assertEquals } from "@std/assert";
import endUserList from "../../actions/end-user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("end-user-list: calls GET /v1/endusers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": [{ "id": "11111111-2222-3333-4444-555555555555" }] },
  }]);
  const out = await endUserList.execute({ "email": "a@b.co" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/endusers");
  assertEquals(queryOf(calls[0].url), { "email": "a@b.co" });
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": [{ "id": "11111111-2222-3333-4444-555555555555" }] });
});

Deno.test("end-user-list: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await endUserList.execute({ "email": "a@b.co" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});
