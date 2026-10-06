import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-company.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-company: POSTs the domain", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "name": "Stripe", "domain": "stripe.com" },
  }]);
  const out = await action.execute!({ "domain": "stripe.com" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/company");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "domain": "stripe.com",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "name": "Stripe", "domain": "stripe.com" });
});

Deno.test("get-company: rejects a call with no identifier before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({} as never, ctx));
  assert((err as Error).message.includes("needs a LinkedIn URL"));
  assertEquals(calls.length, 0);
});

Deno.test("get-company: surfaces a 404 miss", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { "message": "Not Found" } }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "name": "Nope" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 404"), msg);
  assert(msg.includes("HTTP 404"), msg);
});
