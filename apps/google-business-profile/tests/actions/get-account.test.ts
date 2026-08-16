import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-account.ts";

Deno.test("get-account: GETs /v1/accounts/{id} for a bare id", async () => {
  const body = { name: "accounts/1", accountName: "Sam's Coffee" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ accountId: "1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/accounts/1");
  assertEquals(result, body);
});

Deno.test("get-account: is forgiving of an already-prefixed resource name", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "accounts/1" } }]);
  await action.execute!({ accountId: "accounts/1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/accounts/1");
});
