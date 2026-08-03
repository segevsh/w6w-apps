import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs to /tasks and assembles related_resource from its two halves", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({
    name: "Demo task",
    relatedResourceType: "project",
    relatedResourceId: 144296,
    assigneeId: 137658,
    dueDate: 1496799000,
    priority: "None",
    status: "Open",
    details: "This needs to be done!",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Demo task",
    related_resource: { id: 144296, type: "project" },
    assignee_id: 137658,
    due_date: 1496799000,
    priority: "None",
    status: "Open",
    details: "This needs to be done!",
  });
});

Deno.test("create-task: omits related_resource unless BOTH halves are supplied", async () => {
  for (const partial of [{ relatedResourceType: "project" }, { relatedResourceId: 1 }, {}]) {
    const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
    await action.execute({ name: "T", ...partial }, ctx);
    const body = JSON.parse(calls[0].body!);
    assert(!("related_resource" in body), `half-built object sent for ${JSON.stringify(partial)}`);
  }
});

Deno.test("create-task: does not offer completed_date — Copper sets it and rejects direct writes", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assert(!keys.some((k) => /completed/i.test(k)));
});

Deno.test("create-task: offers Copper's parent types and status/priority vocabularies", () => {
  assertEquals(optionValues(action, "relatedResourceType"), [
    "lead",
    "person",
    "company",
    "opportunity",
    "project",
    "task",
  ]);
  assertEquals(optionValues(action, "status"), ["Open", "Completed"]);
  assertEquals(optionValues(action, "priority"), ["None", "Low", "Medium", "High"]);
});

Deno.test("create-task: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
