import { assert, assertEquals } from "@std/assert";
import conversationListByEndUser from "../../actions/conversation-list-by-end-user.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list-by-end-user: calls GET /v1/endusers/11111111-2222-3333-4444-555555555555/conversations", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": 1 }],
      "meta": {
        "next":
          "/v1/endusers/11111111-2222-3333-4444-555555555555/conversations?pageKey=abc%3D%3D&pageLimit=2",
      },
    },
  }]);
  const out = await conversationListByEndUser.execute(
    { "userId": "11111111-2222-3333-4444-555555555555", "pageLimit": 2 } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(
    pathOf(calls[0].url),
    "/v1/endusers/11111111-2222-3333-4444-555555555555/conversations",
  );
  assertEquals(queryOf(calls[0].url), { "pageLimit": "2" });
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: [{ "id": 1 }], nextPageKey: "abc==" });
});

Deno.test("conversation-list-by-end-user: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationListByEndUser.execute(
      { "userId": "11111111-2222-3333-4444-555555555555", "pageLimit": 2 } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-list-by-end-user: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationListByEndUser.execute({ "userId": "" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("userId is required"), message);
  assertEquals(calls.length, 0);
});
