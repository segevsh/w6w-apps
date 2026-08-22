import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/org-get.ts";

Deno.test("org-get: reads the connection's org by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "org-1" } } }], {
    display: { orgId: "org-1" },
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1");
});

Deno.test("org-get: with no org anywhere it says so", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "orgId");
  assertEquals(calls.length, 0);
});
