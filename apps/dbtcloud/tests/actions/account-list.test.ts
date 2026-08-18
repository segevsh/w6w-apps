import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("account-list: reads the accounts the token can reach", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: [{ id: 42, name: "Acme" }] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/");
  assertEquals(result.count, 1);
});

Deno.test("account-list: an unexpected shape becomes an empty list, not a crash", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: null } }], { display });
  assertEquals((await action.execute!({}, ctx) as { count: number }).count, 0);
});

/** Confirming which account a connection points at when a job id 404s. */
Deno.test("account-list: says what it is for", () => {
  assert(/404/.test(action.description!), action.description);
});
