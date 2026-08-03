import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import removeSubscriberFromWorkflow from "../../actions/remove-subscriber-from-workflow.ts";

Deno.test("remove-subscriber-from-workflow: both ids are PATH segments here", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await removeSubscriberFromWorkflow.execute(
    { workflowId: "wf1", idOrEmail: "ada@example.com" },
    ctx,
  );

  assertEquals(
    calls[0].url,
    "https://api.flodesk.com/v1/workflows/wf1/subscribers/ada%40example.com",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("remove-subscriber-from-workflow: IS idempotent — removal converges", () => {
  assertEquals(removeSubscriberFromWorkflow.idempotent, true);
});

Deno.test("remove-subscriber-from-workflow: raises on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "bad" } }]);
  await assertRejects(
    () =>
      removeSubscriberFromWorkflow.execute(
        { workflowId: "wf1", idOrEmail: "x" },
        ctx,
      ) as Promise<unknown>,
    Error,
  );
});
