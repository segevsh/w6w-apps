import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-rollback.ts";

test("deployment-rollback: the reason is a query param, per Vercel's schema", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], { display: {} });
  const result = await action.execute!({
    projectId: "prj_1",
    deploymentId: "dpl_old",
    description: "bad release",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/projects/prj_1/rollback/dpl_old");
  assertEquals(url.searchParams.get("description"), "bad release");
  assertEquals(calls[0].body, null);
  assertEquals(result, { projectId: "prj_1", deploymentId: "dpl_old", requested: true });
});

test("deployment-rollback: both ids are required before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "prj_1" }, ctx),
    Error,
    "`deploymentId`",
  );
  assertEquals(calls.length, 0);
});
