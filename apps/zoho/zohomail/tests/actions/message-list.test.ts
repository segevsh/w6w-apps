import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { envelope, mockCtx, pathOf, queryOf, usConnection } from "../_helpers.ts";

Deno.test("message-list: fetches messages/view with the given filters", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([{ messageId: "m1", subject: "Hi" }]) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageList.execute(
    { folderId: "f1", status: "unread", threadedMails: true, includeto: true },
    ctx,
  ) as unknown as Record<string, unknown>[];

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/messages/view");
  assertEquals(queryOf(calls[0].url), {
    folderId: "f1",
    status: "unread",
    threadedMails: "true",
    includeto: "true",
  });
  assertEquals(out, [{ messageId: "m1", subject: "Hi" }]);
});

Deno.test("message-list: sends no query params beyond what was set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }], usConnection());
  await messageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("message-list: returns an empty array when the envelope carries no data", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  assertEquals(await messageList.execute({}, ctx), []);
});
