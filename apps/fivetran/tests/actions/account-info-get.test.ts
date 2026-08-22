import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/account-info-get.ts";

/** A trial is capped forty times tighter, and nothing else says so. */
Deno.test("account-info-get: flags a trial account explicitly", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1", name: "Acme", account_type: "Trial" })]);
  const result = await action.execute!({}, ctx) as { isTrial: boolean };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/account/info");
  assertEquals(result.isTrial, true);
});

Deno.test("account-info-get: a paid account is not a trial", async () => {
  const { ctx } = mockCtx([ok({ account_type: "Enterprise" })]);
  const result = await action.execute!({}, ctx) as { isTrial: boolean };
  assertEquals(result.isTrial, false);
});

Deno.test("account-info-get: a missing plan does not become a trial", async () => {
  const { ctx } = mockCtx([ok({ id: "a1" })]);
  const result = await action.execute!({}, ctx) as { isTrial: boolean };
  assertEquals(result.isTrial, false);
});

Deno.test("account-info-get: says what the plan changes", () => {
  assert(/500 API requests an hour/.test(action.description!), action.description);
});
