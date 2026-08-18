import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/alert-policy-list.ts";

const policies = ok({
  actor: {
    account: {
      alerts: {
        policiesSearch: {
          policies: [
            { id: "1", name: "Prod", incidentPreference: "PER_POLICY" },
            { id: "2", name: "Staging", incidentPreference: "PER_CONDITION" },
          ],
          nextCursor: "c1",
        },
      },
    },
  },
});

Deno.test("alert-policy-list: queries the connection's account", async () => {
  const { ctx, calls } = mockCtx([policies], { display });
  const result = await action.execute!({}, ctx) as { count: number; cursor: string };
  assertEquals(JSON.parse(calls[0].body!).variables.accountId, 12345);
  assertEquals(result.count, 2);
  assertEquals(result.cursor, "c1");
});

/**
 * PER_POLICY groups everything into one incident, so a second failure during an
 * open one notifies nobody — the setting most responsible for missed alerts.
 */
Deno.test("alert-policy-list: counts the policies that group everything into one incident", async () => {
  const { ctx } = mockCtx([policies], { display });
  const result = await action.execute!({}, ctx) as { perPolicyCount: number };
  assertEquals(result.perPolicyCount, 1);
});

Deno.test("alert-policy-list: an account with no policies is a count of zero", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { account: { alerts: { policiesSearch: { policies: [] } } } } }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number; cursor?: string };
  assertEquals(result.count, 0);
  assertEquals(result.cursor, undefined);
});

Deno.test("alert-policy-list: no account anywhere is an explanatory failure", async () => {
  const { ctx } = mockCtx([], { display: { region: "US" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "several accounts");
});

/** A policy with no conditions is legal and watches nothing. */
Deno.test("alert-policy-list: points at the action that answers what is monitored", () => {
  assert(/alert-condition-list/.test(action.description!), action.description);
});
