import { assertEquals } from "@std/assert";
import mailboxList from "../../actions/mailbox-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailbox-list: lists mailboxes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{
      "id": 123456,
      "type": "SMTP",
      "details": { "email": "jared@piedpiper.com", "daily_limit": 50 },
    }],
  }]);
  const out = await mailboxList.execute({} as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/mailboxes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.count, 1);
  assertEquals((out.mailboxes as Array<{ id: number }>)[0].id, 123456);
});

Deno.test("mailbox-list: no mailboxes is an empty list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const out = await mailboxList.execute({} as never, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/mailboxes");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.mailboxes, []);
});
