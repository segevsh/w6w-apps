import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/linkedin-account-status.ts";

Deno.test("linkedin-account-status: the account id is a PATH segment, not a query param", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { accountId: "42", status: "Connected", failureReason: "" },
  }]);
  const result = await action.execute!({ accountId: 42 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.heyreach.io/api/public/li_account/GetAccountStatus/42",
  );
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals((result as { status: string }).status, "Connected");
});

Deno.test("linkedin-account-status: the Sales Navigator and Recruiter flags survive", async () => {
  const body = {
    accountId: "42",
    status: "Connected",
    salesNavigator: { authenticated: true },
    recruiter: { authenticated: false },
  };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute!({ accountId: 42 }, ctx), body);
});
