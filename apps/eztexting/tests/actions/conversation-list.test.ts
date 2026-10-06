import { assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: calls GET /conversations and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ userNumber: "8005550100", contactNumber: "2125551234", unreadCount: 2 }]),
  }]);
  const result = await conversationList.execute(
    { "query": "ada", "unread": true, "optType": "OPTIN" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations`);
  assertEquals(queryOf(calls[0].url), {
    "filters[query][eq]": "ada",
    "filters[unread][eq]": "true",
    "filters[optType][eq]": "OPTIN",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "userNumber": "8005550100", "contactNumber": "2125551234", "unreadCount": 2 }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("conversation-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ userNumber: "8005550100", contactNumber: "2125551234", unreadCount: 2 }]),
  }]);
  await conversationList.execute(
    { "query": "ada", "unread": true, "optType": "OPTIN" } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
