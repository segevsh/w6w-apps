import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/create-account.ts";

Deno.test("create-account: POSTs the documented CreateOrUpdateAccount body", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  const result = await action.execute!({
    accountName: "acme-002",
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@acme.com",
    accountType: "CUSTOMER",
    companyName: "Acme",
    lang: "en",
    standing: "ACTIVE",
    status: "OK",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/accounts/create");
  assertEquals(JSON.parse(calls[0].body!), {
    account_name: "acme-002",
    first_name: "Grace",
    last_name: "Hopper",
    email: "grace@acme.com",
    account_type: "CUSTOMER",
    company_name: "Acme",
    lang: "en",
    standing: "ACTIVE",
    status: "OK",
  });
  assertEquals(result, { status: 204 });
});

Deno.test("create-account: the three required fields are the schema's", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  await action.execute!({ accountName: "acme-003", firstName: "Ada", lastName: "Lovelace" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    account_name: "acme-003",
    first_name: "Ada",
    last_name: "Lovelace",
  });
  for (const key of ["accountName", "firstName", "lastName"]) {
    assertEquals(action.params!.find((p) => p.key === key)?.required, true, key);
  }
});

/**
 * Duda's documented callout: creating or updating an account sends the account
 * no email, so a workflow that provisions a customer has to notify them itself.
 */
Deno.test("create-account: says that Duda emails nobody on account creation", () => {
  assert(/does not send the new account an email/i.test(action.description!), action.description);
  assert(/does not send the new account an email/i.test(
    action.params!.find((p) => p.key === "email")!.hint!,
  ));
});

Deno.test("create-account: the two enums are Duda's", () => {
  const values = (key: string) =>
    (action.params!.find((p) => p.key === key)!.options as Array<{ value: string }>)
      .map((o) => o.value);
  assertEquals(values("accountType"), ["CUSTOMER", "STAFF"]);
  assertEquals(values("standing"), ["ACTIVE", "SUSPENDED"]);
  assertEquals(values("status"), ["OK", "SUSPENDED"]);
});

Deno.test("create-account: an already-existing account is Duda's ResourceAlreadyExist", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: { error_code: "ResourceAlreadyExist", message: "Account name is already used" },
  }]);
  const err = await Promise.resolve(action.execute!(
    { accountName: "acme-002", firstName: "Grace", lastName: "Hopper" },
    ctx,
  )).catch((e: Error) => e);
  assertEquals(
    (err as Error).message,
    "Duda 400 for POST /api/accounts/create: ResourceAlreadyExist: Account name is already used",
  );
});
