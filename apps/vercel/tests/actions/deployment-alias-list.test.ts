import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-alias-list.ts";

Deno.test("deployment-alias-list: asks what one deployment answers to", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { aliases: [{ alias: "a.com" }] } }], {
    display: {},
  });
  const result = await action.execute!({ deploymentId: "dpl_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/deployments/dpl_1/aliases");
  assertEquals(result, { aliases: [{ alias: "a.com" }] });
});

Deno.test("deployment-alias-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`deploymentId`");
  assertEquals(calls.length, 0);
});
