import { assertEquals } from "@std/assert";
import action from "../../actions/intellimatch-status.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("intellimatch-status: GETs status with the hash in the query", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": "processing", "progress": 45 },
  }]);
  const out = await action.execute!({ "hash": "abc" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/status");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "hash": "abc" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "status": "processing", "progress": 45 });
});
