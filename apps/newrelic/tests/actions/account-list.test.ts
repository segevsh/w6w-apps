import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/account-list.ts";

const accounts = ok({
  actor: { accounts: [{ id: 12345, name: "Prod" }, { id: 67890, name: "Staging" }] },
});

Deno.test("account-list: returns the accounts and the connection's default", async () => {
  const { ctx } = mockCtx([accounts], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    region: string;
    defaultAccountId: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.region, "US");
  assertEquals(result.defaultAccountId, 12345);
});

/** No default recorded is a normal state, not a failure. */
Deno.test("account-list: works with no default account recorded", async () => {
  const { ctx } = mockCtx([accounts], { display: { region: "EU" } });
  const result = await action.execute!({}, ctx) as {
    defaultAccountId?: number;
    region: string;
  };
  assertEquals(result.defaultAccountId, undefined);
  assertEquals(result.region, "EU");
});

Deno.test("account-list: a key that sees nothing is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ actor: { accounts: [] } })], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("account-list: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** An account in the other region is absent, not listed and empty. */
Deno.test("account-list: says what the other region looks like from here", () => {
  assert(/OTHER region is absent/.test(action.description!), action.description);
});
