import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

test("account-get: GETs /sales_accounts/:id and unwraps `sales_account`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{
    body: { sales_account: { id: 3, name: "Widgetz" } },
  }]);
  const out = await action.execute({ accountId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/3");
  assertEquals(out, { id: 3, name: "Widgetz" });
});

test("account-get: joins include into a comma-separated query param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { sales_account: {} } }]);
  await action.execute({ accountId: 3, include: ["owner", "territory"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/3?include=owner%2Cterritory",
  );
});
