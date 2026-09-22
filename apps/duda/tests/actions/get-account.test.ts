import { assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/get-account.ts";

/** Property names with spaces are the vendor's own — copied from the `Account` schema. */
const account = {
  "Account name identifier": "acme-001",
  "Account first name": "Ada",
  "Account last name": "Lovelace",
  email: "ada@acme.com",
  account_type: "CUSTOMER",
  standing: "ACTIVE",
  status: "OK",
  accountData: { company_name: "Acme" },
};

Deno.test("get-account: GETs /api/accounts/{accountName} and passes the body through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: account }]);
  const result = await action.execute!({ accountName: "acme-001" }, ctx) as typeof account;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/accounts/acme-001");
  // Documented as-is, spaces and all: three properties are the vendor's own strings.
  assertEquals(result["Account first name"], "Ada");
  assertEquals(result["Account name identifier"], "acme-001");
  assertEquals(result.account_type, "CUSTOMER");
  assertEquals(result.accountData, { company_name: "Acme" });
});

Deno.test("get-account: the output names the spaced properties the same way", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  for (const key of ["Account name identifier", "Account first name", "Account last name"]) {
    assertEquals(keys.includes(key), true, key);
  }
});

Deno.test("get-account: encodes the account name as one path segment", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: account }]);
  await action.execute!({ accountName: "acme 001" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/accounts/acme%20001");
});
