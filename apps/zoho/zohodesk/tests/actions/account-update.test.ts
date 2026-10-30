import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/account-update.ts";

test("account-update: PATCHes /accounts/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "3", website: "https://acme.com" } }]);
  const out = await action.execute(
    { recordId: "3", fields: { website: "https://acme.com" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/accounts/3");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out, { id: "3", website: "https://acme.com" });
});

test("account-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
