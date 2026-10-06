import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/add-excluded-domains.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("add-excluded-domains: splits the comma list into an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "success": true, "total": 2 } }]);
  const out = await action.execute!({ "domains": "a.com, b.io ,", "list_id": 1 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/domains");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "domains": ["a.com", "b.io"],
    "list_id": 1,
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "success": true, "total": 2 });
});

Deno.test("add-excluded-domains: rejects an empty domain list before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await action.execute!({ "domains": " , " } as never, ctx)
  );
  assert((err as Error).message.includes("at least one domain"));
  assertEquals(calls.length, 0);
});
