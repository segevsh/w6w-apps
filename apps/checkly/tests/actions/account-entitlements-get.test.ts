import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-entitlements-get.ts";

Deno.test("account-entitlements-get: reads the plan's allowances", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { plan: "team", entitlements: [{ key: "checks", type: "metered", quantity: 100 }] },
  }]);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/accounts/me/entitlements");
  assertEquals(result.plan, "team");
  assertEquals(action.params, []);
});

/** quantity is the maximum, not what is left — the reason quota is an absence. */
Deno.test("account-entitlements-get: the output says quantity is not headroom", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "entitlements")!.label.includes("not what is left"));
  assert(action.description!.includes("not the usage"), action.description);
});
