import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/linkedin-account-get.ts";

Deno.test("linkedin-account-get: the account id is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "42" } }]);
  const result = await action.execute!({ accountId: 42 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/li_account/GetById?accountId=42");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: "42" });
});

Deno.test("linkedin-account-get: the full account object is returned, limits included", async () => {
  const account = {
    id: "42",
    firstName: "Alice",
    accountLimits: { messageLimit: "20", messageLimitMax: "25" },
  };
  const { ctx } = mockCtx([{ status: 200, body: account }]);
  assertEquals(await action.execute!({ accountId: 42 }, ctx), account);
});
