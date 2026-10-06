import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-exclusion-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-exclusion-list: GETs the list by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 3, "name": "Competitors" } }]);
  const out = await action.execute!({ "id": 3 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/exclusion-lists/3");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 3, "name": "Competitors" });
});

Deno.test("get-exclusion-list: surfaces a 404", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { "message": "No query results for model [ExcludedDomainList]." },
  }]);
  const err = await assertRejects(async () => await action.execute!({ "id": 9 } as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 404"), msg);
  assert(msg.includes("HTTP 404"), msg);
});
