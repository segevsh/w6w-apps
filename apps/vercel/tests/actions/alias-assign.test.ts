import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias-assign.ts";

test("alias-assign: POSTs the alias onto the deployment", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { uid: "al_1", alias: "my-app.com", oldDeploymentId: "dpl_old" },
  }], { display: {} });
  const result = await action.execute!({ deploymentId: "dpl_1", alias: "my-app.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/deployments/dpl_1/aliases");
  assertEquals(JSON.parse(calls[0].body!), { alias: "my-app.com" });
  // oldDeploymentId is what you keep if you might revert.
  assertEquals((result as Record<string, unknown>).oldDeploymentId, "dpl_old");
});

test("alias-assign: a redirect target is sent when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ deploymentId: "dpl_1", alias: "a.com", redirect: "b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { alias: "a.com", redirect: "b.com" });
});

test("alias-assign: deployment and alias are both required", async () => {
  const a = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ alias: "a.com" }, a.ctx),
    Error,
    "`deploymentId`",
  );
  const b = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ deploymentId: "dpl_1" }, b.ctx),
    Error,
    "`alias`",
  );
  assertEquals(a.calls.length + b.calls.length, 0);
});
