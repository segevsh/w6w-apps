import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-dispatch.ts";

Deno.test("workflow-dispatch: POSTs the dispatches route with ref and inputs", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    {
      owner: "acme",
      repository: "api",
      workflowId: "ci.yml",
      ref: "main",
      inputs: { environment: "staging" },
    },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/actions/workflows/ci.yml/dispatches",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    ref: "main",
    inputs: { environment: "staging" },
  });
});

Deno.test("workflow-dispatch: is not idempotent — each call queues another run", () => {
  assertEquals(action.idempotent, false);
});
