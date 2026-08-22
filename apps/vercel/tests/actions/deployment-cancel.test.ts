import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-cancel.ts";

Deno.test("deployment-cancel: PATCHes the cancel endpoint, with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { readyState: "CANCELED" } }], {
    display: {},
  });
  const result = await action.execute!({ deploymentId: "dpl_1" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v12/deployments/dpl_1/cancel");
  assertEquals(calls[0].body, null);
  assertEquals(result, { readyState: "CANCELED" });
});

Deno.test("deployment-cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`deploymentId`");
  assertEquals(calls.length, 0);
});
