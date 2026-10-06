import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-lookup: posts the identifiers and returns the first match", async () => {
  const { ctx, calls } = mockCtx([{
    body: { companies: [{ id: "c1" }], metadata: { credits: 0.25 } },
  }]);
  const out = await action.execute!(
    { domain: "anthropic.com", professionalNetworkId: 1883877 },
    ctx,
  );
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/company/lookup");
  assertEquals(JSON.parse(calls[0].body!), {
    domain: "anthropic.com",
    professional_network_id: 1883877,
  });
  assertEquals(out, { company: { id: "c1" }, credits: 0.25 });
});

Deno.test("company-lookup: no match returns null", async () => {
  const { ctx } = mockCtx([{ body: { companies: [] } }]);
  assertEquals(await action.execute!({ domain: "x.io" }, ctx), { company: null, credits: null });
});

Deno.test("company-lookup: a 429 is thrown", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { code: "error.rate.limit", message: "slow" } }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "slow");
});
