import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/remove-excluded-domains.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("remove-excluded-domains: DELETEs with a numeric ids array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute!({ "ids": "4, 5" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/domains");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "ids": [4, 5] });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "deleted": true, "ids": [4, 5] });
});

Deno.test("remove-excluded-domains: rejects a non-numeric id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await action.execute!({ "ids": "4,abc" } as never, ctx)
  );
  assert((err as Error).message.includes("whole numbers"));
  assertEquals(calls.length, 0);
});
