import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-team-usage.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-team-usage: GETs the team summary", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "total": { "finder": 150, "verifier": 75 },
      "members": [{ "name": "John Doe", "finder": 100, "verifier": 50 }],
    },
  }]);
  const out = await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/credits/report/team-summary");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "total": { "finder": 150, "verifier": 75 },
    "members": [{ "name": "John Doe", "finder": 100, "verifier": 50 }],
  });
});

Deno.test("get-team-usage: surfaces the non-owner 403", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { "error": "You must be the team owner to access this endpoint" },
  }]);
  const err = await assertRejects(async () => await action.execute!({} as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 403"), msg);
  assert(msg.includes("team owner"), msg);
});
