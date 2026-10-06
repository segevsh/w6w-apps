import { assertEquals, assertRejects } from "@std/assert";
import mailboxGet from "../../actions/mailbox-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailbox-get: GET /rest/v2/mailboxes/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "id": 456789,
      "type": "SMTP",
      "details": { "email": "jared@getpiedpiper.com", "reconnect_required": false },
    },
  }]);
  const out = await mailboxGet.execute({ "mailbox_id": "456789" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/mailboxes/456789");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.type, "SMTP");
});

Deno.test("mailbox-get: rejects an empty id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await mailboxGet.execute({ "mailbox_id": "" } as never, ctx),
    Error,
    "ID was empty",
  );
  assertEquals(calls.length, 0);
});
