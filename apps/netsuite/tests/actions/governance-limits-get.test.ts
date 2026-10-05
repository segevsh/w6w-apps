import { assertEquals, assertRejects } from "@std/assert";
import governanceLimitsGet from "../../actions/governance-limits-get.ts";
import { BASE, mockCtx, nsError, run } from "../_helpers.ts";

Deno.test("governance-limits-get: integrationSpecific carries all four fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      accountConcurrencyLimit: 5,
      accountUnallocatedConcurrencyLimit: 3,
      integrationConcurrencyLimit: 2,
      integrationLimitType: "integrationSpecific",
    },
  }]);
  const out = await run(governanceLimitsGet, {}, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/system/v1/governanceLimits`);
  assertEquals(out, {
    accountConcurrencyLimit: 5,
    accountUnallocatedConcurrencyLimit: 3,
    integrationConcurrencyLimit: 2,
    integrationLimitType: "integrationSpecific",
  });
});

Deno.test("governance-limits-get: accountLimit has no integration figure", async () => {
  const { ctx } = mockCtx([{
    body: {
      accountConcurrencyLimit: 5,
      accountUnallocatedConcurrencyLimit: 3,
      integrationLimitType: "accountLimit",
    },
  }]);
  const out = await run(governanceLimitsGet, {}, ctx);
  assertEquals(out.integrationConcurrencyLimit, null);
  assertEquals(out.integrationLimitType, "accountLimit");
});

Deno.test("governance-limits-get: a non-admin refusal is raised", async () => {
  const { ctx } = mockCtx([nsError(403, "INSUFFICIENT_PERMISSION", "Admins only.")]);
  await assertRejects(async () => await run(governanceLimitsGet, {}, ctx), Error, "Admins only.");
});
