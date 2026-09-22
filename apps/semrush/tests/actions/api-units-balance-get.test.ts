import { assert, assertEquals, assertRejects } from "@std/assert";
import apiUnitsBalanceGet from "../../actions/api-units-balance-get.ts";
import { hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-units-balance-get: reads the free balance endpoint on the legacy host", async () => {
  const { ctx, calls } = mockCtx([{ body: "1,000" }]);

  const out = await apiUnitsBalanceGet.execute({}, ctx) as { balance: number };

  assertEquals(hostOf(calls[0].url), "www.semrush.com");
  assertEquals(pathOf(calls[0].url), "/users/countapiunits.html");
  // The key is added by `sign`, never by the Action — see auth/api-key.ts.
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.balance, 1000);
});

Deno.test("api-units-balance-get: a zero balance is a valid reading, not an error", async () => {
  const { ctx } = mockCtx([{ body: "0" }]);

  const out = await apiUnitsBalanceGet.execute({}, ctx) as { balance: number };

  assertEquals(out.balance, 0);
});

/**
 * The one hard-won finding from this app's research: this endpoint echoes the
 * submitted API key back inside `errors[0].message`. Nothing downstream may
 * ever repeat that text, so the Action returns a status-only message.
 */
Deno.test("api-units-balance-get: a 400 does NOT echo the vendor's raw error text", async () => {
  const secret = "sk-live-0000-1111-2222-3333";
  const { ctx } = mockCtx([
    {
      status: 400,
      body: JSON.stringify({
        errors: [{ field: "key", message: `invalid api key: ${secret}` }],
      }),
    },
  ]);

  const err = await assertRejects(async () => {
    await apiUnitsBalanceGet.execute({}, ctx);
  }, Error);
  assert(!err.message.includes(secret), "the API key leaked into the error message");
  assert(!err.message.includes("invalid api key"), "the vendor's raw message was passed through");
  assertEquals(err.message, "SEMrush returned HTTP 400 for the API-units endpoint");
});

Deno.test("api-units-balance-get: a non-numeric 200 body is an error with no body text", async () => {
  const { ctx } = mockCtx([{ body: "<html>maintenance</html>" }]);

  const err = await assertRejects(async () => {
    await apiUnitsBalanceGet.execute({}, ctx);
  }, Error);

  assert(!err.message.includes("maintenance"));
  assertEquals(
    err.message,
    "SEMrush returned HTTP 200 for the API-units endpoint but the body was not a unit count",
  );
});

Deno.test("api-units-balance-get: takes no parameters and declares `balance`", () => {
  assertEquals(apiUnitsBalanceGet.params?.length, 0);
  assertEquals(apiUnitsBalanceGet.output, [
    { key: "balance", type: "number", label: "API units remaining" },
  ]);
});
