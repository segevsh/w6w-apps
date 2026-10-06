import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/intellimatch-results.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("intellimatch-results: GETs one page of results", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": [{ "id": 1, "domain": "acme.com" }] },
  }]);
  const out = await action.execute!({ "hash": "abc", "page": 2, "per_page": 100 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/data");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "hash": "abc",
    "page": "2",
    "per_page": "100",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "data": [{ "id": 1, "domain": "acme.com" }] });
});

Deno.test("intellimatch-results: surfaces the not-ready 404", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { "status": "error", "message": "Export not found or not ready yet" },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "hash": "abc" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 404"), msg);
  assert(msg.includes("not ready yet"), msg);
});
