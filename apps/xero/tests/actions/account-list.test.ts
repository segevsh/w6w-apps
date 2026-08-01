import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: GETs /Accounts and forwards where/order", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Accounts: [] } }]);
  await action.execute({ where: 'Type=="BANK"' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api.xro/2.0/Accounts");
  assertEquals(url.searchParams.get("where"), 'Type=="BANK"');
});
