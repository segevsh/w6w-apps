import { assertEquals } from "@std/assert";
import action from "../../actions/lookup-technologies.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("lookup-technologies: POSTs the domain and filter and wraps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "technologies": [{ "name": "React" }] },
  }]);
  const out = await action.execute!(
    { "domain": "stripe.com", "technologies": "React, Ruby" } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/technologies");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "domain": "stripe.com",
    "technologies": ["React", "Ruby"],
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "result": { "technologies": [{ "name": "React" }] } });
});
