import { assertEquals } from "@std/assert";
import mailboxUpdate from "../../actions/mailbox-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("mailbox-update: PATCHes the footer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await mailboxUpdate.execute(
    { "mailbox_id": "9", "footer": "<div>Best,</div>" } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/mailboxes/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "footer": "<div>Best,</div>" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.updated, true);
});

Deno.test("mailbox-update: an empty footer is sent to clear it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await mailboxUpdate.execute({ "mailbox_id": "9", "footer": "" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/mailboxes/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "footer": "" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});
