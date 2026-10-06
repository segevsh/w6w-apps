import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-exclusion-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-exclusion-list: POSTs name and sharing", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "id": 1, "name": "Competitors", "is_shared": true, "is_owner": true },
  }]);
  const out = await action.execute!({ "name": "Competitors", "is_shared": true } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/exclusion-lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Competitors",
    "is_shared": true,
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 1, "name": "Competitors", "is_shared": true, "is_owner": true });
});

Deno.test("create-exclusion-list: surfaces a 422 duplicate-name error with the field", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "message": "The given data was invalid.",
      "errors": { "name": ["The name has already been taken."] },
    },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "name": "Competitors" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 422"), msg);
  assert(msg.includes("name: The name has already been taken."), msg);
});
