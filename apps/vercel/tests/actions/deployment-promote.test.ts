import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-promote.ts";

Deno.test("deployment-promote: POSTs and reports the request, since Vercel sends no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: "" }], { display: {} });
  const result = await action.execute!({ projectId: "prj_1", deploymentId: "dpl_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v10/projects/prj_1/promote/dpl_1");
  assertEquals(result, { projectId: "prj_1", deploymentId: "dpl_1", requested: true });
});

Deno.test("deployment-promote: both ids are required before any request", async () => {
  const a = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ deploymentId: "dpl_1" }, a.ctx),
    Error,
    "`projectId`",
  );
  const b = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ projectId: "prj_1" }, b.ctx),
    Error,
    "`deploymentId`",
  );
  assertEquals(a.calls.length + b.calls.length, 0);
});
