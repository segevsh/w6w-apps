import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-get.ts";

Deno.test("connection-get: fetches one connection by id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "conn_1", state: "active", domains: [{ domain: "acme.com" }] },
  }]);
  const result = await action.execute!({ connectionId: "conn_1" }, ctx) as { state: string };
  assertEquals(calls[0].url, "https://api.workos.com/connections/conn_1");
  assertEquals(result.state, "active");
});

/** "It says active and it still doesn't work" is almost always the domains. */
Deno.test("connection-get: explains that active with the wrong domain is never reached", () => {
  assert(/domains do not match/.test(action.description!), action.description);
});

Deno.test("connection-get: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});
