import { assert, assertEquals, assertRejects } from "@std/assert";
import workflowGet from "../../actions/workflow-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workflow-get: GET /workflows/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", step: "Review" } }]);
  const out = await workflowGet.execute({ workflowId: "w1" }, ctx) as { step: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/w1");
  assertEquals(out.step, "Review");
});

Deno.test("workflow-get: an id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await workflowGet.execute({ workflowId: "a/../b?x=1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows/a%2F..%2Fb%3Fx%3D1");
});

Deno.test("workflow-get: surfaces Ironclad's error code and param", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "INVALID_PARAM", message: "bad id", param: "id" },
  }]);
  const err = await assertRejects(async () => await workflowGet.execute({ workflowId: "x" }, ctx));
  assert(String((err as Error).message).includes("INVALID_PARAM"));
  assert(String((err as Error).message).includes("`id`"));
});
