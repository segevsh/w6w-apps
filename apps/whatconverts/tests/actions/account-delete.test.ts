import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountDelete from "../../actions/account-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("account-delete sends DELETE with no body and returns the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 5411295 } }]);
  const out = await accountDelete.execute({ accountId: 5411295 }, ctx);
  assertEquals(out, { account_id: 5411295 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295`);
  assertEquals(calls[0].body, null);
});

test("account-delete is declared not idempotent", () => {
  assertEquals(accountDelete.idempotent, false);
});
