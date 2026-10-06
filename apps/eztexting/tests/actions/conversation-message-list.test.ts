import { assertEquals } from "@std/assert";
import conversationMessageList from "../../actions/conversation-message-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("conversation-message-list: calls GET /conversations/conversation/8005550100/2125551234 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "1", inbound: true, message: "yes" }]) }]);
  const result = await conversationMessageList.execute(
    {
      "userNumber": "8005550100",
      "contactNumber": "2125551234",
      "markRead": true,
      "sort": "sentAt,desc",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url.split("?")[0],
    `${API_ROOT}/conversations/conversation/8005550100/2125551234`,
  );
  assertEquals(queryOf(calls[0].url), { "read": "true", "sort": "sentAt,desc" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": "1", "inbound": true, "message": "yes" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("conversation-message-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "1", inbound: true, message: "yes" }]) }]);
  await conversationMessageList.execute(
    {
      "userNumber": "8005550100",
      "contactNumber": "2125551234",
      "markRead": true,
      "sort": "sentAt,desc",
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("conversation-message-list: does not mark messages read unless asked", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await conversationMessageList.execute(
    { userNumber: "8005550100", contactNumber: "2125551234" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});
