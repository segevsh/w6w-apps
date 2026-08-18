import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/carrier-account-list.ts";

/** The usual explanation for an empty rates array. */
Deno.test("carrier-account-list: names the carriers for a quick read", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      { id: "ca_1", type: "UpsAccount", readable: "UPS" },
      { id: "ca_2", type: "FedexAccount", readable: "FedEx" },
    ],
  }]);
  const result = await action.execute!({}, ctx) as { count: number; carriers: string[] };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/carrier_accounts");
  assertEquals(result.count, 2);
  assertEquals(result.carriers, ["UPS", "FedEx"]);
});

Deno.test("carrier-account-list: falls back to the type when there is no readable name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "ca_1", type: "UspsAccount" }] }]);
  const result = await action.execute!({}, ctx) as { carriers: string[] };
  assertEquals(result.carriers, ["UspsAccount"]);
});

/** Rating considers at most 60 and silently uses the first sixty. */
Deno.test("carrier-account-list: flags an account over the rating ceiling", async () => {
  const many = Array.from({ length: 61 }, (_, i) => ({ id: `ca_${i}`, readable: `C${i}` }));
  const { ctx } = mockCtx([{ status: 200, body: many }]);
  const result = await action.execute!({}, ctx) as { overRatingLimit: boolean };
  assertEquals(result.overRatingLimit, true);

  const few = mockCtx([{ status: 200, body: [{ id: "ca_1" }] }]);
  const ok = await action.execute!({}, few.ctx) as { overRatingLimit: boolean };
  assertEquals(ok.overRatingLimit, false);
});

Deno.test("carrier-account-list: an unexpected shape becomes an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await action.execute!({}, ctx) as { count: number }).count, 0);
});

/** EasyPost redacts credentials, which is what makes this schedulable. */
Deno.test("carrier-account-list: says the credentials are redacted", () => {
  assert(/redacted/.test(action.description!), action.description);
});
