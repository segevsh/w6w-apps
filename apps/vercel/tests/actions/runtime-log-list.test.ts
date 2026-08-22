import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/runtime-log-list.ts";

Deno.test("runtime-log-list: reads the per-deployment runtime log endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { level: "error" } }], {
    display: { teamId: "team_abc" },
  });
  await action.execute!({ projectId: "prj_1", deploymentId: "dpl_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/projects/prj_1/deployments/dpl_1/runtime-logs");
  assertEquals(url.searchParams.get("teamId"), "team_abc");
});

Deno.test("runtime-log-list: both ids are required before any request", async () => {
  const noProject = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ deploymentId: "dpl_1" }, noProject.ctx),
    Error,
    "`projectId`",
  );
  const noDeployment = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "prj_1" }, noDeployment.ctx),
    Error,
    "`deploymentId`",
  );
  assertEquals(noProject.calls.length + noDeployment.calls.length, 0);
});
