import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-summary-list.ts";

Deno.test("account-summary-list: needs no ids at all — it is where you start", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { accountSummaries: [{ account: "accounts/1", propertySummaries: [] }] },
  }], { display: {} });
  const result = await action.execute!({}, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1beta/accountSummaries",
  );
  assertEquals(result, [{ account: "accounts/1", propertySummaries: [] }]);
});

Deno.test("account-summary-list: returnAll walks every page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { accountSummaries: [{ account: "a/1" }], nextPageToken: "t2" } },
    { status: 200, body: { accountSummaries: [{ account: "a/2" }] } },
  ], { display: {} });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [
    { account: "a/1" },
    { account: "a/2" },
  ]);
  assertEquals(calls.length, 2);
});
