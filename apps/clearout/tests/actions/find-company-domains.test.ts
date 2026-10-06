import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/find-company-domains.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("find-company-domains: GETs the public autocomplete path and passes data through", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", data: [{ domain: "stripe.com" }] },
  }]);
  const out = await run(action, { query: "Stripe Inc" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.clearout.io/v2/public/companies/autocomplete?query=Stripe+Inc",
  );
  assertEquals(out.result, [{ domain: "stripe.com" }]);
});

Deno.test("find-company-domains: blank query throws; a 429 throws", async () => {
  await assertRejects(() => run(action, { query: " " }, mockCtx().ctx), Error, "query is required");
  const busy = mockCtx([{ status: 429, body: { status: "failed", error: { message: "slow" } } }]);
  await assertRejects(() => run(action, { query: "x" }, busy.ctx), Error, "rate limit");
});
