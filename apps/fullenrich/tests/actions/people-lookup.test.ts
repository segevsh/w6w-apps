import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/people-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("people-lookup: posts only the identifiers given and returns the first match", async () => {
  const { ctx, calls } = mockCtx([{
    body: { people: [{ id: "p1" }, { id: "p2" }], metadata: { credits: 0.25 } },
  }]);
  const out = await action.execute!({
    personName: "Enzo Romera",
    companyDomain: "anthropic.com",
    companyProfessionalNetworkId: 1883877,
  }, ctx);
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/people/lookup");
  assertEquals(JSON.parse(calls[0].body!), {
    person_name: "Enzo Romera",
    company_domain: "anthropic.com",
    company_professional_network_id: 1883877,
  });
  assertEquals(out, { person: { id: "p1" }, credits: 0.25 });
});

Deno.test("people-lookup: no match returns null", async () => {
  const { ctx } = mockCtx([{ body: { people: [], metadata: { credits: 0 } } }]);
  assertEquals(await action.execute!({ personProfessionalNetworkUrl: "https://x" }, ctx), {
    person: null,
    credits: 0,
  });
});

Deno.test("people-lookup: a 400 is thrown", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "error.bad", message: "bad input" } }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "bad input");
});
