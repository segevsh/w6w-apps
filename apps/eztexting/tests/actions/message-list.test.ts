import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("message-list: calls GET /messages and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: "1", message: "hi" }], { totalPages: 3, totalElements: 41 }),
  }]);
  const result = await messageList.execute(
    {
      "userNumber": "8005550100",
      "incoming": true,
      "unread": false,
      "type": "sms",
      "sentAfter": "2026-01-01T00:00:00+00:00",
      "page": 2,
      "size": "50",
      "sort": "sentAt,desc",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/messages`);
  assertEquals(queryOf(calls[0].url), {
    "page": "2",
    "size": "50",
    "sort": "sentAt,desc",
    "filters[userNumber][eq]": "8005550100",
    "filters[incoming][eq]": "true",
    "filters[unread][eq]": "false",
    "filters[type][eq]": "sms",
    "filters[sentAt][gte]": "2026-01-01T00:00:00+00:00",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": "1", "message": "hi" }],
    "totalPages": 3,
    "totalElements": 41,
    "numberOfElements": 1,
  });
});

Deno.test("message-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: "1", message: "hi" }], { totalPages: 3, totalElements: 41 }),
  }]);
  await messageList.execute(
    {
      "userNumber": "8005550100",
      "incoming": true,
      "unread": false,
      "type": "sms",
      "sentAfter": "2026-01-01T00:00:00+00:00",
      "page": 2,
      "size": "50",
      "sort": "sentAt,desc",
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
