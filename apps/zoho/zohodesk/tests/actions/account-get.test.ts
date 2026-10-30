import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

test("account-get: GETs /accounts/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "3", accountName: "Zylker" } }]);
  const out = await action.execute({ recordId: "3" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/accounts/3");
  assertEquals(out, { id: "3", accountName: "Zylker" });
});
