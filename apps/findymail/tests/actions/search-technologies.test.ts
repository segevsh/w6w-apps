import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-technologies.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-technologies: GETs with q in the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "data": [{ "name": "React" }] } }]);
  const out = await action.execute!({ "q": "react" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/technologies/search");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "q": "react" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "data": [{ "name": "React" }] });
});

Deno.test("search-technologies: surfaces the 429 rate limit", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { "message": "Too Many Attempts." } }]);
  const err = await assertRejects(async () => await action.execute!({ "q": "re" } as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 429"), msg);
  assert(msg.includes("Too Many Attempts."), msg);
});
