import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/lookalike-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("lookalike-search: POSTs the seed and wraps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "companies": [{ "domain": "adyen.com" }] },
  }]);
  const out = await action.execute!(
    { "seed": "stripe.com", "limit": 20, "exclusion_list_ids": "1,2" } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/lookalike/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "seed": "stripe.com",
    "limit": 20,
    "exclusion_list_ids": [1, 2],
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "result": { "companies": [{ "domain": "adyen.com" }] } });
});

Deno.test("lookalike-search: surfaces a 402 insufficient credits error", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { "error": "insufficient_credits", "message": "You don't have enough credits." },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "seed": "a.com" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 402"), msg);
  assert(msg.includes("insufficient_credits"), msg);
});
