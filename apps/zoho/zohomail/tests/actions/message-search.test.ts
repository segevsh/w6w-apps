import { assertEquals } from "@std/assert";
import messageSearch from "../../actions/message-search.ts";
import { envelope, mockCtx, pathOf, queryOf, usConnection } from "../_helpers.ts";

Deno.test("message-search: fetches messages/search with searchKey", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([{ messageId: 1, subject: "Invoice" }]) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageSearch.execute(
    { searchKey: "subject:invoice" },
    ctx,
  ) as unknown as Record<string, unknown>[];

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/messages/search");
  assertEquals(queryOf(calls[0].url), { searchKey: "subject:invoice" });
  assertEquals(out, [{ messageId: 1, subject: "Invoice" }]);
});

Deno.test("message-search: passes receivedTime and pagination through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }], usConnection());
  await messageSearch.execute(
    { searchKey: "newMails", receivedTime: 1609459200000, start: 1, limit: 5 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    searchKey: "newMails",
    receivedTime: "1609459200000",
    start: "1",
    limit: "5",
  });
});

Deno.test("message-search: type is search", () => {
  assertEquals(messageSearch.type, "search");
});
