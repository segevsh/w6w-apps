import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import addSubscriberToWorkflow from "../../actions/add-subscriber-to-workflow.ts";

Deno.test("add-subscriber-to-workflow: subscriber goes in the BODY, workflow in the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await addSubscriberToWorkflow.execute(
    { workflowId: "wf1", email: "ada@example.com" },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/workflows/wf1/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "ada@example.com" });
  assertEquals(out, { status: 204 });
});

Deno.test("add-subscriber-to-workflow: accepts an id instead of an email", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await addSubscriberToWorkflow.execute({ workflowId: "wf1", id: "61b2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "61b2" });
});

Deno.test("add-subscriber-to-workflow: rejects a call identifying nobody", async () => {
  const { ctx, calls } = mockCtx([]);
  // `execute` is async here, but the guard runs before the first await, so this
  // is asserted as a rejection rather than a synchronous throw.
  await assertRejects(
    () => addSubscriberToWorkflow.execute({ workflowId: "wf1" }, ctx) as Promise<unknown>,
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-subscriber-to-workflow: is deliberately NOT idempotent", () => {
  // Entering a workflow is an event, not a state: a retry can resend the sequence.
  assertEquals(addSubscriberToWorkflow.idempotent, false);
});

Deno.test("add-subscriber-to-workflow: raises a useful error on a 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "not_found" } }]);
  const err = await assertRejects(
    () => addSubscriberToWorkflow.execute({ workflowId: "nope", id: "x" }, ctx) as Promise<unknown>,
    Error,
  );
  assert(err.message.includes("404"));
  assert(err.message.includes("nope"));
});
