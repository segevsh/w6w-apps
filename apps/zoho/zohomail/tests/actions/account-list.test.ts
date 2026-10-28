import { assertEquals } from "@std/assert";
import accountList from "../../actions/account-list.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("account-list: fetches /api/accounts and returns the array", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([{ accountId: "1", primaryEmailAddress: "a@zylker.com" }]) }],
    usConnection(),
  );
  const out = await accountList.execute({}, ctx) as unknown as Record<string, unknown>[];

  assertEquals(pathOf(calls[0].url), "/api/accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, [{ accountId: "1", primaryEmailAddress: "a@zylker.com" }]);
});

Deno.test("account-list: returns an empty array when the envelope carries no data", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  const out = await accountList.execute({}, ctx);
  assertEquals(out, []);
});

Deno.test("account-list: takes no parameters", () => {
  assertEquals(accountList.params?.length, 0);
});
