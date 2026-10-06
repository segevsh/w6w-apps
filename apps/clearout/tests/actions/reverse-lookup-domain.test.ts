import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-lookup-domain.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("reverse-lookup-domain: sends name= and maps the company lead", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        name: "stripe.com",
        lead: {
          name: "Stripe",
          linkedin_url: "https://l/company/stripe",
          addresses: { country: "US" },
        },
      },
    },
  }]);
  const out = await run(action, { name: "stripe.com" }, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/reverse_lookup/domain?name=stripe.com");
  assertEquals((out.lead as Record<string, unknown>).name, "Stripe");
  assertEquals(out.name, "stripe.com");
});

Deno.test("reverse-lookup-domain: blank name throws", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "name is required");
});
