import { assertEquals } from "@std/assert";
import inboxMessageList from "../../actions/inbox-message-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("inbox-message-list: filters and returns the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "content": [{ "id": 123456, "subject": "Re: Hello" }],
      "pagination": { "previous_page_cursor": null, "next_page_cursor": "abc=" },
    },
  }]);
  const out = await inboxMessageList.execute(
    { "prospect_interest_level": "INTERESTED", "per_page": 2, "read": false } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/inbox/messages");
  assertEquals(queryOf(calls[0].url), {
    "prospect_interest_level": "INTERESTED",
    "per_page": "2",
    "read": "false",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.nextCursor, "abc=");
  assertEquals(out.count, 1);
});

Deno.test("inbox-message-list: last page has a null cursor", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "content": [], "pagination": { "next_page_cursor": null } },
  }]);
  const out = await inboxMessageList.execute({} as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/inbox/messages");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.nextCursor, null);
});
